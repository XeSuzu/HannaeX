import { Guild, User, GuildMember, TextChannel } from "discord.js";
import { SettingsManager } from "../Database/SettingsManager";
import { isAllowedByDomain } from "./linkAllowlist";
import {
  executeAutomodActionSafely,
} from "./automod/automodActionExecutor";
import {
  checkSpamForUser,
  getSpamTrackerStats,
} from "./automod/automodState";
import {
  getActionHistory,
  recordManualAction,
  removeWhitelistUser,
  whitelistUser,
} from "./automod/automodPersistence";

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
  static async executeActionSafely(
    guild: Guild,
    member: GuildMember,
    action: AutomodAction,
    context: ExecutionContext
  ): Promise<boolean> {
    return executeAutomodActionSafely(guild, member, action, context);
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
      const blockedUrl = urls.find((url) => !isAllowedByDomain(url, whitelist));

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

  static async checkSpam(guild: Guild, userId: string): Promise<AutomodAction | null> {
    return checkSpamForUser(guild, userId);
  }

  static async recordManualAction(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    type: "warn" | "mute" | "kick" | "ban" | "unmute",
    reason: string,
  ): Promise<void> {
    return recordManualAction(guild, target, moderator, type, reason);
  }

  static async getActionHistory(
    guildId: string,
    userId: string,
    limit: number = 10
  ): Promise<ActionLogEntry[]> {
    return getActionHistory(guildId, userId, limit);
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

  static async whitelistUser(guildId: string, userId: string): Promise<void> {
    return whitelistUser(guildId, userId);
  }

  static async removeWhitelistUser(guildId: string, userId: string): Promise<void> {
    return removeWhitelistUser(guildId, userId);
  }

  static getSpamTrackerStats(guildId: string): { users: number; entries: number } {
    return getSpamTrackerStats(guildId);
  }
}
