import { Guild, User, GuildMember } from "discord.js";
import { addWarning } from "../../Database/moderation/warning.model";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import type { ActionLogEntry, AutomodAction } from "../AutomodManager";

export async function isWhitelisted(guildId: string, userId: string): Promise<boolean> {
  try {
    const settings = await SettingsManager.getSettings(guildId);
    return ((settings as any)?.whitelistedUsers ?? []).includes(userId);
  } catch (error) {
    console.error("[Automod] Error checking whitelist:", error);
    return false;
  }
}

export async function logActionEntry(
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

export async function recordManualAction(
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

export async function getActionHistory(
  guildId: string,
  userId: string,
  limit: number = 10
): Promise<ActionLogEntry[]> {
  try {
    const { getWarnings } = await import("../../Database/moderation/warning.model.js");
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

export async function whitelistUser(guildId: string, userId: string): Promise<void> {
  try {
    const settings = await SettingsManager.getSettings(guildId);
    const users = new Set((settings as any)?.whitelistedUsers || []);
    users.add(userId);
    await SettingsManager.updateSettings(guildId, {
      whitelistedUsers: Array.from(users),
    } as any);
  } catch (error) {
    console.error("[Automod] Error whitelisting user:", error);
  }
}

export async function removeWhitelistUser(guildId: string, userId: string): Promise<void> {
  try {
    const settings = await SettingsManager.getSettings(guildId);
    const users = ((settings as any)?.whitelistedUsers || []).filter(
      (id: string) => id !== userId,
    );
    await SettingsManager.updateSettings(guildId, {
      whitelistedUsers: users,
    } as any);
  } catch (error) {
    console.error("[Automod] Error removing user from whitelist:", error);
  }
}
