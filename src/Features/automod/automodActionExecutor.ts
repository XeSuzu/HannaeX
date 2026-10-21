import { Guild, GuildMember } from "discord.js";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { Logger } from "../../Utils/SystemLogger";
import { canExecuteAction, recordSuccessfulAction } from "./automodState";
import { isWhitelisted, logActionEntry } from "./automodPersistence";
import { createCase } from "../../Database/moderation/case.model";
import type { AutomodAction, ExecutionContext } from "../AutomodManager";

export async function executeAutomodActionSafely(
  guild: Guild,
  member: GuildMember,
  action: AutomodAction,
  context: ExecutionContext
): Promise<boolean> {
  const guildId = guild.id;
  const userId = member.id;

  try {
    const validation = await canExecuteAction(guild, member, action, context, isWhitelisted);
    if (!validation.canExecute) {
      console.log(`[Automod] Action blocked: ${validation.reason} (${userId} in ${guildId})`);
      return false;
    }

    const success = await performAction(guild, member, action);

    if (success) {
      await logActionEntry(
        guildId,
        userId,
        guild.client.user!.id,
        action,
        context.eventType
      );

      await createCase({
        guildId,
        userId,
        modId: "auto",
        action: action.type === "mute" ? "timeout" : (action.type as any),
        reason: action.reason,
        source: "automod",
        durationMs: action.duration,
      }).catch(() => null);

      recordSuccessfulAction(guildId, userId, action.type);

      void HoshikoLogger.sendLog(
        guild,
        "AUTOMOD",
        `**Sanción aplicada:** \`${action.type.toUpperCase()}\`\n**Motivo:** ${action.reason}\n**Contexto:** \`${context.eventType}\``,
        member.user,
      );

      if (action.reason.includes("spam") || action.reason.includes("raid") || action.reason.includes("link")) {
        await Logger.logAnomalyDetected(
          "AutomodAction",
          `${member.user.tag} in ${guild.name}: ${action.type}`,
          guild.name
        );
      }
    }

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

async function performAction(
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
