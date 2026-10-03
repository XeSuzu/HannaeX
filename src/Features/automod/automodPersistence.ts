import { Guild, User, GuildMember } from "discord.js";
import { addWarning } from "../../Models/Warning";
import GuildConfig from "../../Models/GuildConfig";
import type { ActionLogEntry, AutomodAction } from "../AutomodManager";

export async function isWhitelisted(guildId: string, userId: string): Promise<boolean> {
  try {
    const config = await GuildConfig.findOne({ guildId }).lean();
    return ((config as any)?.whitelistedUsers ?? []).includes(userId);
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
    const { getWarnings } = await import("../../Models/Warning.js");
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
    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $addToSet: { whitelistedUsers: userId } },
      { upsert: true }
    );
  } catch (error) {
    console.error("[Automod] Error whitelisting user:", error);
  }
}

export async function removeWhitelistUser(guildId: string, userId: string): Promise<void> {
  try {
    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $pull: { whitelistedUsers: userId } }
    );
  } catch (error) {
    console.error("[Automod] Error removing user from whitelist:", error);
  }
}
