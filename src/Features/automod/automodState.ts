import { Guild, GuildMember } from "discord.js";
import type { AutomodAction, ExecutionContext } from "../AutomodManager";

type WhitelistCheck = (guildId: string, userId: string) => Promise<boolean>;

const spamTracker = new Map<string, Map<string, number[]>>();
const actionCooldown = new Map<string, Map<string, Map<string, number>>>();
const serverRateLimit = new Map<string, { count: number; resetTime: number }>();
const deduplicationCache = new Map<string, Map<string, { actionHash: string; timestamp: number }>>();
let lastCleanup = Date.now();

export async function canExecuteAction(
  guild: Guild,
  member: GuildMember,
  action: AutomodAction,
  _context: ExecutionContext,
  isWhitelisted: WhitelistCheck
): Promise<{ canExecute: boolean; reason?: string }> {
  const guildId = guild.id;
  const userId = member.id;

  if (userId === guild.client.user?.id || userId === guild.ownerId)
    return { canExecute: false, reason: "Target is bot or guild owner" };

  if (member.permissions.has("Administrator"))
    return { canExecute: false, reason: "Target has Administrator permission" };

  if (await isWhitelisted(guildId, userId))
    return { canExecute: false, reason: "User is whitelisted" };

  if (!actionCooldown.has(guildId)) actionCooldown.set(guildId, new Map());
  const userCooldowns = actionCooldown.get(guildId)!;
  if (!userCooldowns.has(userId)) userCooldowns.set(userId, new Map());
  const cooldowns = userCooldowns.get(userId)!;
  const lastActionTime = cooldowns.get(action.type) || 0;
  const now = Date.now();

  if (now - lastActionTime < 60000)
    return { canExecute: false, reason: `Cooldown active for ${action.type}` };

  const rateLimit = serverRateLimit.get(guildId) || {
    count: 0,
    resetTime: now + 60_000,
  };
  if (now > rateLimit.resetTime) {
    serverRateLimit.set(guildId, { count: 1, resetTime: now + 60000 });
  } else if (rateLimit.count >= 5) {
    return { canExecute: false, reason: "Server rate limit exceeded (5 actions/min)" };
  } else {
    rateLimit.count++;
    serverRateLimit.set(guildId, rateLimit);
  }

  const actionHash = `${action.type}:${action.reason}`;
  if (!deduplicationCache.has(guildId)) deduplicationCache.set(guildId, new Map());
  const dedupMap = deduplicationCache.get(guildId)!;
  const lastDedupInfo = dedupMap.get(userId);

  if (lastDedupInfo && now - lastDedupInfo.timestamp < 500 && lastDedupInfo.actionHash === actionHash)
    return { canExecute: false, reason: "Duplicate action within 500ms" };

  dedupMap.set(userId, { actionHash, timestamp: now });
  return { canExecute: true };
}

export function recordSuccessfulAction(
  guildId: string,
  userId: string,
  actionType: AutomodAction["type"]
): void {
  if (!actionCooldown.has(guildId)) actionCooldown.set(guildId, new Map());
  const userCooldowns = actionCooldown.get(guildId)!;
  if (!userCooldowns.has(userId)) userCooldowns.set(userId, new Map());
  userCooldowns.get(userId)!.set(actionType, Date.now());
}

export async function checkSpamForUser(
  guild: Guild,
  userId: string
): Promise<AutomodAction | null> {
  try {
    const now = Date.now();
    const guildId = guild.id;

    if (!spamTracker.has(guildId)) spamTracker.set(guildId, new Map());
    const guildTracker = spamTracker.get(guildId)!;
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
    if (Math.random() < 0.01) cleanup();
    return null;
  } catch (error) {
    console.error(`[Automod] Error en checkSpam:`, error);
    return null;
  }
}

export function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 300000) return;
  lastCleanup = now;

  for (const [guildId, guildTracker] of spamTracker.entries()) {
    for (const [userId, times] of guildTracker.entries()) {
      const valid = times.filter((t) => now - t < 60000);
      valid.length === 0 ? guildTracker.delete(userId) : guildTracker.set(userId, valid);
    }
    if (guildTracker.size === 0) spamTracker.delete(guildId);
  }

  for (const [guildId, userCooldowns] of actionCooldown.entries()) {
    for (const [userId, cooldowns] of userCooldowns.entries()) {
      for (const [action, timestamp] of cooldowns.entries()) {
        if (now - timestamp > 60000) cooldowns.delete(action);
      }
      if (cooldowns.size === 0) userCooldowns.delete(userId);
    }
    if (userCooldowns.size === 0) actionCooldown.delete(guildId);
  }

  for (const [guildId, dedupMap] of deduplicationCache.entries()) {
    for (const [userId, info] of dedupMap.entries()) {
      if (now - info.timestamp > 60000) dedupMap.delete(userId);
    }
    if (dedupMap.size === 0) deduplicationCache.delete(guildId);
  }

  for (const [guildId, rateLimit] of serverRateLimit.entries()) {
    if (now > rateLimit.resetTime) serverRateLimit.delete(guildId);
  }

  console.log("[Automod] Memory cleanup completed");
}

export function getSpamTrackerStats(guildId: string): { users: number; entries: number } {
  const guildTracker = spamTracker.get(guildId);
  if (!guildTracker) return { users: 0, entries: 0 };
  let totalEntries = 0;
  for (const times of guildTracker.values()) totalEntries += times.length;
  return { users: guildTracker.size, entries: totalEntries };
}
