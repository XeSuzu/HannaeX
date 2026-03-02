import { Guild, User, GuildMember, TextChannel } from "discord.js";
import { Logger } from "../Utils/SystemLogger";
import { SettingsManager } from "../Database/SettingsManager";
import { addWarning } from "../Models/Warning";
import GuildConfig from "../Models/GuildConfig";

export interface AutomodAction {
  type: "warn" | "mute" | "kick" | "ban";
  duration?: number;
  reason: string;
}

export interface ActionLogEntry {
  userId: string;
  username: string;
  action: AutomodAction["type"];
  reason: string;
  timestamp: number;
  success: boolean;
  executedBy?: string;
}

export interface ExecutionContext {
  eventType: string;
  timestamp: number;
  guildId: string;
}

export class AutomodManager {
  // Spam tracker en memoria — está bien, no necesita persistencia
  private static spamTracker = new Map<string, Map<string, number[]>>();
  // Cooldowns en memoria — está bien, se resetean al reiniciar
  private static actionCooldown = new Map<string, Map<string, Map<string, number>>>();
  private static serverRateLimit = new Map<string, { count: number; resetTime: number }>();
  private static deduplicationCache = new Map<string, Map<string, { actionHash: string; timestamp: number }>>();
  private static lastCleanup = Date.now();

  private static async canExecuteAction(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction,
    context: ExecutionContext
  ): Promise<{ canExecute: boolean; reason?: string }> {
    const guildId = guild.id;
    const userId = member.id;

    if (userId === guild.client.user?.id || userId === guild.ownerId)
      return { canExecute: false, reason: "Target is bot or guild owner" };

    if (member.permissions.has("Administrator"))
      return { canExecute: false, reason: "Target has Administrator permission" };

    if (await this.isWhitelisted(guildId, userId))
      return { canExecute: false, reason: "User is whitelisted" };

    if (!this.actionCooldown.has(guildId)) this.actionCooldown.set(guildId, new Map());
    const userCooldowns = this.actionCooldown.get(guildId)!;
    if (!userCooldowns.has(userId)) userCooldowns.set(userId, new Map());
    const cooldowns = userCooldowns.get(userId)!;
    const lastActionTime = cooldowns.get(action.type) || 0;
    const now = Date.now();

    if (now - lastActionTime < 60000)
      return { canExecute: false, reason: `Cooldown active for ${action.type}` };

    const rateLimit = this.serverRateLimit.get(guildId) || { count: 0, resetTime: now };
    if (now > rateLimit.resetTime) {
      this.serverRateLimit.set(guildId, { count: 1, resetTime: now + 60000 });
    } else if (rateLimit.count >= 5) {
      return { canExecute: false, reason: "Server rate limit exceeded (5 actions/min)" };
    } else {
      rateLimit.count++;
      this.serverRateLimit.set(guildId, rateLimit);
    }

    const actionHash = `${action.type}:${action.reason}`;
    if (!this.deduplicationCache.has(guildId)) this.deduplicationCache.set(guildId, new Map());
    const dedupMap = this.deduplicationCache.get(guildId)!;
    const lastDedupInfo = dedupMap.get(userId);

    if (lastDedupInfo && now - lastDedupInfo.timestamp < 500 && lastDedupInfo.actionHash === actionHash)
      return { canExecute: false, reason: "Duplicate action within 500ms" };

    dedupMap.set(userId, { actionHash, timestamp: now });
    return { canExecute: true };
  }

  static async executeActionSafely(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction,
    context: ExecutionContext
  ): Promise<boolean> {
    const guildId = guild.id;
    const userId = member.id;

    try {
      const validation = await this.canExecuteAction(guild, member, action, context);
      if (!validation.canExecute) {
        console.log(`[Automod] Action blocked: ${validation.reason} (${userId} in ${guildId})`);
        return false;
      }

      const success = await this.performAction(guild, member, action);

      if (success) {
        // ✅ Persistir en MongoDB
        await this.logActionEntry(
          guildId,
          userId,
          guild.client.user!.id,
          action,
          context.eventType
        );

        if (!this.actionCooldown.has(guildId)) this.actionCooldown.set(guildId, new Map());
        const userCooldowns = this.actionCooldown.get(guildId)!;
        if (!userCooldowns.has(userId)) userCooldowns.set(userId, new Map());
        userCooldowns.get(userId)!.set(action.type, Date.now());

        if (action.reason.includes("spam") || action.reason.includes("raid") || action.reason.includes("link")) {
          await Logger.logAnomalyDetected(
            "AutomodAction",
            `${member.user.tag} in ${guild.name}: ${action.type}`,
            guild.name
          );
        }
      }

      if (Math.random() < 0.01) this.cleanup();
      return success;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Logger.logCriticalError(
        "AutomodManager.executeActionSafely",
        errorMsg,
        error instanceof Error ? error.stack : undefined
      );
      return false;
    }
  }

  private static async performAction(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction
  ): Promise<boolean> {
    try {
      switch (action.type) {
        case "warn":
          try {
            await member.user.send(`⚠️ **Aviso en ${guild.name}**\n\nMotivo: ${action.reason}`);
          } catch {
            console.log(`[Automod] No DM to ${member.user.tag}`);
          }
          return true;

        case "mute": {
          const duration = action.duration || 10 * 60 * 1000;
          await member.timeout(duration, `[Automod Global] ${action.reason}`);
          await Logger.logMute(guild.client.user!, member.user, duration, action.reason, guild.name);
          return true;
        }

        case "kick":
          await member.kick(`[Automod Global] ${action.reason}`);
          await Logger.logKick(guild.client.user!, member.user, action.reason, guild.name);
          return true;

        case "ban":
          await member.ban({ reason: `[Automod Global] ${action.reason}` });
          await Logger.logBan(guild.client.user!, member.user, action.reason, guild.name);
          return true;
      }
      return false;
    } catch (error) {
      console.error(`[Automod] Error performing action on ${member.user.tag}:`, error);
      return false;
    }
  }

  static async executeAction(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction,
    logContext: string
  ): Promise<boolean> {
    return this.executeActionSafely(guild, member, action, {
      eventType: logContext,
      timestamp: Date.now(),
      guildId: guild.id,
    });
  }

  static async checkLinks(
    content: string,
    guild: Guild,
    member: GuildMember
  ): Promise<AutomodAction | null> {
    try {
      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings?.securityModules?.antiLinks) return null;

      const urls = content.match(/https?:\/\/[^\s]+/g) || [];
      if (urls.length === 0) return null;

      const whitelist = settings.allowedLinks || [];
      const blockedUrl = urls.find((url) => !whitelist.some((allowed) => url.includes(allowed)));

      if (blockedUrl) {
        return {
          type: "mute",
          duration: 5 * 60 * 1000,
          reason: `Link no permitido en ${guild.name}: ${blockedUrl.slice(0, 50)}`,
        };
      }
      return null;
    } catch (error) {
      console.error(`[Automod] Error en checkLinks para ${guild.id}:`, error);
      return null;
    }
  }

  static async checkSpam(
    guild: Guild,
    userId: string
  ): Promise<AutomodAction | null> {
    try {
      const now = Date.now();
      const guildId = guild.id;

      if (!this.spamTracker.has(guildId)) this.spamTracker.set(guildId, new Map());
      const guildTracker = this.spamTracker.get(guildId)!;
      const userTimes = guildTracker.get(userId) || [];
      const recentMessages = userTimes.filter((t) => now - t < 5000);

      if (recentMessages.length >= 4) {
        guildTracker.set(userId, []);
        return {
          type: "mute",
          duration: 10 * 60 * 1000,
          reason: `Spam detectado en ${guild.name} (4+ mensajes en 5s)`,
        };
      }

      recentMessages.push(now);
      guildTracker.set(userId, recentMessages);
      if (Math.random() < 0.01) this.cleanup();
      return null;
    } catch (error) {
      console.error(`[Automod] Error en checkSpam:`, error);
      return null;
    }
  }

  private static cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 300000) return;
    this.lastCleanup = now;

    for (const [guildId, guildTracker] of this.spamTracker.entries()) {
      for (const [userId, times] of guildTracker.entries()) {
        const valid = times.filter((t) => now - t < 60000);
        valid.length === 0 ? guildTracker.delete(userId) : guildTracker.set(userId, valid);
      }
      if (guildTracker.size === 0) this.spamTracker.delete(guildId);
    }

    for (const [guildId, userCooldowns] of this.actionCooldown.entries()) {
      for (const [userId, cooldowns] of userCooldowns.entries()) {
        for (const [action, timestamp] of cooldowns.entries()) {
          if (now - timestamp > 60000) cooldowns.delete(action);
        }
        if (cooldowns.size === 0) userCooldowns.delete(userId);
      }
      if (userCooldowns.size === 0) this.actionCooldown.delete(guildId);
    }

    for (const [guildId, dedupMap] of this.deduplicationCache.entries()) {
      for (const [userId, info] of dedupMap.entries()) {
        if (now - info.timestamp > 60000) dedupMap.delete(userId);
      }
      if (dedupMap.size === 0) this.deduplicationCache.delete(guildId);
    }

    for (const [guildId, rateLimit] of this.serverRateLimit.entries()) {
      if (now > rateLimit.resetTime) this.serverRateLimit.delete(guildId);
    }

    console.log("[Automod] Memory cleanup completed");
  }

  /**
   * ✅ Persiste la acción en MongoDB
   */
  private static async logActionEntry(
    guildId: string,
    userId: string,
    moderatorId: string,
    action: AutomodAction,
    eventType: string,
  ): Promise<void> {
    try {
      await addWarning(
        guildId,
        userId,
        moderatorId,
        `[${eventType}] ${action.reason}`,
        action.type,
        moderatorId
      );
    } catch (error) {
      console.error("[Automod] Error persisting action to DB:", error);
    }
  }

  static async recordManualAction(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    type: "warn" | "mute" | "kick" | "ban" | "unmute",
    reason: string,
  ): Promise<void> {
    const logType = type === "unmute" ? "warn" : type;
    const finalReason = type === "unmute" ? `[PARDON] ${reason}` : `[MANUAL] ${reason}`;
    await addWarning(guild.id, target.id, moderator.id, finalReason, logType, moderator.id);
  }

  /**
   * ✅ Whitelist persistente — lee de GuildConfig en MongoDB
   */
  private static async isWhitelisted(guildId: string, userId: string): Promise<boolean> {
    try {
      const config = await GuildConfig.findOne({ guildId }).lean();
      return ((config as any)?.whitelistedUsers ?? []).includes(userId);
    } catch (error) {
      console.error("[Automod] Error checking whitelist:", error);
      return false;
    }
  }

  /**
   * ✅ Historial persistente — lee de MongoDB
   */
  static async getActionHistory(
    guildId: string,
    userId: string,
    limit: number = 10
  ): Promise<ActionLogEntry[]> {
    try {
      const { getWarnings } = await import("../Models/Warning.js");
      const warnings = await getWarnings(guildId, userId);
      return warnings.slice(0, limit).map((w) => ({
        userId: w.userId,
        username: "",
        action: w.type,
        reason: w.reason,
        timestamp: new Date(w.createdAt).getTime(),
        success: true,
        executedBy: w.executedBy,
      }));
    } catch (error) {
      console.error("[Automod] Error getting action history:", error);
      return [];
    }
  }

  static async logAction(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction,
    modlogChannel?: string
  ): Promise<void> {
    if (!modlogChannel) return;
    try {
      const channel = (await guild.channels.fetch(modlogChannel)) as TextChannel;
      if (!channel) return;
      await channel.send({
        embeds: [{
          color: action.type === "ban" ? 0xff0000 : 0xff9800,
          title: `⚠️ Automod: ${action.type.toUpperCase()}`,
          description: `**Usuario:** ${member.user.tag}\n**Motivo:** ${action.reason}`,
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (error) {
      console.error(`[Automod] Error enviando embed a modlog en ${guild.id}:`, error);
    }
  }

  /**
   * ✅ Whitelist persistente — guarda en GuildConfig
   */
  static async whitelistUser(guildId: string, userId: string): Promise<void> {
    try {
      await GuildConfig.findOneAndUpdate(
        { guildId },
        { $addToSet: { whitelistedUsers: userId } },
        { upsert: true }
      );
    } catch (error) {
      console.error("[Automod] Error whitelisting user:", error);
    }
  }

  /**
   * ✅ Whitelist persistente — elimina de GuildConfig
   */
  static async removeWhitelistUser(guildId: string, userId: string): Promise<void> {
    try {
      await GuildConfig.findOneAndUpdate(
        { guildId },
        { $pull: { whitelistedUsers: userId } }
      );
    } catch (error) {
      console.error("[Automod] Error removing user from whitelist:", error);
    }
  }

  static getSpamTrackerStats(guildId: string): { users: number; entries: number } {
    const guildTracker = this.spamTracker.get(guildId);
    if (!guildTracker) return { users: 0, entries: 0 };
    let totalEntries = 0;
    for (const times of guildTracker.values()) totalEntries += times.length;
    return { users: guildTracker.size, entries: totalEntries };
  }
}