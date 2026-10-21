import { Guild, GuildMember } from "discord.js";
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { RedisClientService } from "../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../App/infrastructure/redis/RedisKeys";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import type { SecurityLevel } from "../../Database/guild/serverConfig.model";
import type { AutomodAction, ExecutionContext } from "../AutomodManager";

type WhitelistCheck = (guildId: string, userId: string) => Promise<boolean>;

interface StressEntry {
  score: number;
  lastUpdated: number;
}

// Umbrales de estrés según el Perfil de Seguridad (Pilar 4)
export const SECURITY_LEVEL_THRESHOLDS: Record<SecurityLevel, number> = {
  1: 150, // Relajado
  2: 100, // Estándar
  3: 60, // Estricto
  4: 30, // Paranoico / Lockdown
};

export const PROFILES = {
  normal: {
    repeat: {
      deleteAt: 3,
      timeoutAt: 4,
      windowMs: 30_000,
      timeoutMs: 5 * 60_000,
    },
    mention: { limit: 5, pingTimeoutMs: 0 },
    wall: { action: "delete" as const },
  },
  raid: {
    repeat: {
      deleteAt: 2,
      timeoutAt: 2,
      windowMs: 30_000,
      timeoutMs: 10 * 60_000,
    },
    mention: { limit: 3, pingTimeoutMs: 10 * 60_000 },
    wall: { action: "delete+timeout" as const },
  },
} as const;

// Cachés L1 con expiración automática LRU (cero recorridos manuales en el Event Loop)
const spamTrackerL1 = new LocalCacheService<{ times: number[] }>(
  "automod_spam",
  { max: 5000, ttlMs: 10_000 },
);
const actionCooldownL1 = new LocalCacheService<{ timestamp: number }>(
  "automod_cd",
  { max: 5000, ttlMs: 60_000, updateAgeOnGet: false },
);
const serverRateLimitL1 = new LocalCacheService<{
  count: number;
  resetTime: number;
}>("automod_srv_rl", { max: 1000, ttlMs: 60_000 });
const dedupL1 = new LocalCacheService<{
  actionHash: string;
  timestamp: number;
}>("automod_dedup", { max: 5000, ttlMs: 2_000 });
const stressL1 = new LocalCacheService<StressEntry>("automod_stress", {
  max: 1000,
  ttlMs: 180_000,
});
const crossChannelL1 = new LocalCacheService<{
  fingerprint: string;
  channels: string[];
  firstSeen: number;
}>("automod_xchan", {
  max: 5000,
  ttlMs: 15_000,
});
const voiceThrashL1 = new LocalCacheService<{ times: number[] }>(
  "automod_vc_thrash",
  {
    max: 3000,
    ttlMs: 20_000,
  },
);

/**
 * Calcula y actualiza el Medidor de Estrés del servidor con decaimiento perezoso (-1 pt/seg).
 * Usa Redis L2 si está activo, o L1 en memoria como fallback inmediato.
 */
export async function addServerStress(
  guildId: string,
  points: number,
): Promise<{ score: number; threshold: number; exceeded: boolean; level: SecurityLevel }> {
  const now = Date.now();
  const settings = await SettingsManager.getSettings(guildId);
  const level: SecurityLevel = settings?.securityModules?.securityLevel ?? 2;
  const threshold = SECURITY_LEVEL_THRESHOLDS[level] ?? 100;

  let current = stressL1.get(guildId);

  if (!current && RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      try {
        const raw = await redis.get(buildRedisKey("stress", guildId));
        if (raw) current = JSON.parse(raw) as StressEntry;
      } catch {}
    }
  }

  const elapsedSeconds = current
    ? Math.max(0, (now - current.lastUpdated) / 1000)
    : 0;
  const decayed = current ? Math.max(0, current.score - elapsedSeconds) : 0;
  const newScore = Math.min(200, Math.max(0, Math.round(decayed + points)));

  const updated: StressEntry = { score: newScore, lastUpdated: now };
  stressL1.set(guildId, updated);

  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      void redis
        .set(
          buildRedisKey("stress", guildId),
          JSON.stringify(updated),
          "EX",
          180,
        )
        .catch(() => undefined);
    }
  }

  return {
    score: newScore,
    threshold,
    exceeded: newScore >= threshold,
    level,
  };
}

export async function getServerStress(guildId: string): Promise<number> {
  const res = await addServerStress(guildId, 0);
  return res.score;
}

export async function isRaidActive(guildId: string): Promise<boolean> {
  const settings = await SettingsManager.getSettings(guildId);
  const level: SecurityLevel = settings?.securityModules?.securityLevel ?? 2;
  const threshold = SECURITY_LEVEL_THRESHOLDS[level] ?? 100;
  const stress = await getServerStress(guildId);
  return stress >= threshold;
}

const userStressContributions = new LocalCacheService<{ total: number; windowStart: number }>(
  "automod_user_stress",
  { max: 5000, ttlMs: 30_000 }
);

/**
 * Principio 4.5: Limita la contribución de estrés por usuario (anti-auto-raid)
 */
export async function addServerStressSafe(
  guildId: string,
  userId: string,
  points: number,
  maxPerWindow = 30,
): Promise<{ score: number; threshold: number; exceeded: boolean; level: SecurityLevel }> {
  const now = Date.now();
  const key = `${guildId}:${userId}`;
  const contrib = userStressContributions.get(key) || { total: 0, windowStart: now };

  let allowedPoints = points;
  if (now - contrib.windowStart > 30_000) {
    contrib.total = 0;
    contrib.windowStart = now;
  }

  if (contrib.total + points > maxPerWindow) {
    allowedPoints = Math.max(0, maxPerWindow - contrib.total);
  }

  contrib.total += allowedPoints;
  userStressContributions.set(key, contrib);

  return addServerStress(guildId, allowedPoints);
}

export async function canExecuteAction(
  guild: Guild,
  member: GuildMember,
  action: AutomodAction,
  _context: ExecutionContext,
  isWhitelisted: WhitelistCheck,
): Promise<{ canExecute: boolean; reason?: string }> {
  const guildId = guild.id;
  const userId = member.id;

  if (userId === guild.client.user?.id || userId === guild.ownerId)
    return { canExecute: false, reason: "Target is bot or guild owner" };

  if (member.permissions.has("Administrator"))
    return { canExecute: false, reason: "Target has Administrator permission" };

  if (await isWhitelisted(guildId, userId))
    return { canExecute: false, reason: "User is whitelisted" };

  const now = Date.now();
  const cdKey = `${guildId}:${userId}:${action.type}`;
  const lastAction = actionCooldownL1.get(cdKey);

  if (lastAction && now - lastAction.timestamp < 60_000)
    return { canExecute: false, reason: `Cooldown active for ${action.type}` };

  const rateLimit = serverRateLimitL1.get(guildId);
  if (!rateLimit || now > rateLimit.resetTime) {
    serverRateLimitL1.set(guildId, { count: 1, resetTime: now + 60_000 });
  } else if (rateLimit.count >= 10) {
    return {
      canExecute: false,
      reason: "Server rate limit exceeded (10 actions/min)",
    };
  } else {
    rateLimit.count++;
    serverRateLimitL1.set(guildId, rateLimit);
  }

  const actionHash = `${action.type}:${action.reason}`;
  const dedupKey = `${guildId}:${userId}`;
  const lastDedupInfo = dedupL1.get(dedupKey);

  if (
    lastDedupInfo &&
    now - lastDedupInfo.timestamp < 500 &&
    lastDedupInfo.actionHash === actionHash
  )
    return { canExecute: false, reason: "Duplicate action within 500ms" };

  dedupL1.set(dedupKey, { actionHash, timestamp: now });
  return { canExecute: true };
}

export function recordSuccessfulAction(
  guildId: string,
  userId: string,
  actionType: AutomodAction["type"],
): void {
  actionCooldownL1.set(`${guildId}:${userId}:${actionType}`, {
    timestamp: Date.now(),
  });
}

export async function checkSpamForUser(
  guild: Guild,
  userId: string,
): Promise<AutomodAction | null> {
  try {
    const now = Date.now();
    const guildId = guild.id;
    const key = `${guildId}:${userId}`;

    const entry = spamTrackerL1.get(key);
    const recentMessages = (entry?.times || []).filter((t) => now - t < 5000);

    if (recentMessages.length >= 4) {
      spamTrackerL1.delete(key);
      await addServerStress(guildId, 25);
      return {
        type: "mute",
        duration: 10 * 60 * 1000,
        reason: `Spam detectado en ${guild.name} (4+ mensajes en 5s)`,
      };
    }

    recentMessages.push(now);
    spamTrackerL1.set(key, { times: recentMessages });
    return null;
  } catch (error) {
    console.error(`[Automod] Error en checkSpam:`, error);
    return null;
  }
}

/**
 * Huella tolerante a variaciones mínimas: minúsculas, sin acentos/símbolos/espacios
 * y con dígitos colapsados. Los adjuntos se identifican por tamaño exacto (archivo idéntico).
 */
export function buildMessageFingerprint(
  content: string,
  attachmentSizes: number[] = [],
): string | null {
  const text = content
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/\d+/g, "0")
    .slice(0, 120);
  const files = attachmentSizes.slice().sort((a, b) => a - b).join(",");
  if (text.length < 6 && !files) return null;
  return `${text}|${files}`;
}

export async function checkCrossChannelSpam(
  guild: Guild,
  userId: string,
  channelId: string,
  content: string,
  attachmentSizes: number[] = [],
): Promise<AutomodAction | null> {
  const fingerprint = buildMessageFingerprint(content, attachmentSizes);
  if (!fingerprint) return null;

  const now = Date.now();
  const key = `${guild.id}:${userId}`;
  const entry = crossChannelL1.get(key);

  if (entry && entry.fingerprint === fingerprint && now - entry.firstSeen < 12_000) {
    if (!entry.channels.includes(channelId)) {
      entry.channels.push(channelId);
    }
    if (entry.channels.length >= 3) {
      crossChannelL1.delete(key);
      await addServerStress(guild.id, 40);
      return {
        type: "mute",
        duration: 30 * 60 * 1000,
        reason: `Spam multi-canal detectado (mismo mensaje en ${entry.channels.length} canales en <12s)`,
      };
    }
    crossChannelL1.set(key, entry);
    return null;
  }

  crossChannelL1.set(key, {
    fingerprint,
    channels: [channelId],
    firstSeen: now,
  });
  return null;
}

/**
 * Normalización de huellas (Principio 4.1):
 * - Normaliza Unicode (NFKC)
 * - Convierte a minúsculas
 * - Remueve menciones (<@!?\d+>, <@&\d+>, <#\d+>)
 * - Remueve caracteres invisibles y zero-width
 * - Colapsa espacios repetidos a uno solo y trim (preservando separación entre palabras)
 */
export function buildNormalizedFingerprint(
  content: string,
  attachmentSizes: number[] = [],
): string | null {
  const text = content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/<@!?\d+>|<@&\d+>|<#\d+>/g, "")
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF\u3164\u115F\u1160]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  const files = attachmentSizes.slice().sort((a, b) => a - b).join(",");
  if (text.length < 3 && !files) return null;
  return `${text}|${files}`;
}

export interface RepeatOccurrence {
  messageId: string;
  channelId: string;
  timestamp: number;
}

export interface RepeatEntry {
  fingerprint: string;
  occurrences: RepeatOccurrence[];
}

const repeatTrackerL1 = new LocalCacheService<RepeatEntry>("automod_repeat_tracker", {
  max: 10_000,
  ttlMs: 60_000,
});

/**
 * Registra síncronamente la huella antes de cualquier await (Principio 4.4).
 */
export function recordMessageOccurrenceSync(
  guildId: string,
  userId: string,
  messageId: string,
  channelId: string,
  content: string,
  attachmentSizes: number[] = [],
  now = Date.now(),
): { fingerprint: string | null; count: number; occurrences: RepeatOccurrence[] } {
  const fingerprint = buildNormalizedFingerprint(content, attachmentSizes);
  if (!fingerprint) return { fingerprint: null, count: 0, occurrences: [] };

  const key = `${guildId}:${userId}:${fingerprint}`;
  const existing = repeatTrackerL1.get(key);
  const windowMs = 30_000;
  const valid = (existing?.occurrences || []).filter((o) => now - o.timestamp < windowMs);

  valid.push({ messageId, channelId, timestamp: now });
  const entry: RepeatEntry = { fingerprint, occurrences: valid };
  repeatTrackerL1.set(key, entry);

  return { fingerprint, count: valid.length, occurrences: valid };
}

export function resetRepeatedMessages(guildId: string, userId: string, fingerprint: string): void {
  repeatTrackerL1.delete(`${guildId}:${userId}:${fingerprint}`);
}

// ─── 4.3 DETECCIÓN MULTI-CUENTA DE COPYPASTA COORDINADO ───────────────────
const multiAccountTrackerL1 = new LocalCacheService<{
  fingerprint: string;
  users: Array<{ userId: string; messageId: string; channelId: string; timestamp: number }>;
}>("automod_multi_repeat", { max: 5000, ttlMs: 60_000 });

export function recordCrossAccountFingerprintSync(
  guildId: string,
  userId: string,
  messageId: string,
  channelId: string,
  fingerprint: string,
  now = Date.now(),
): { uniqueUsersCount: number; occurrences: Array<{ userId: string; messageId: string; channelId: string; timestamp: number }> } {
  const key = `${guildId}:${fingerprint}`;
  const existing = multiAccountTrackerL1.get(key);
  const windowMs = 45_000;
  const valid = (existing?.users || []).filter((u) => now - u.timestamp < windowMs);

  valid.push({ userId, messageId, channelId, timestamp: now });
  multiAccountTrackerL1.set(key, { fingerprint, users: valid });

  const uniqueUsers = new Set(valid.map((u) => u.userId));
  return { uniqueUsersCount: uniqueUsers.size, occurrences: valid };
}

export function resetMultiAccountFingerprints(guildId: string, fingerprint: string): void {
  multiAccountTrackerL1.delete(`${guildId}:${fingerprint}`);
}

// ─── 4.4 RIESGO POR SEÑALES COMPUESTAS (Pilar 7.4) ─────────────────────────
export function calculateJoinRiskScore(signals: {
  accountAgeDays: number;
  hasNoAvatar: boolean;
  isIrregularName: boolean;
  joinedInRaidWindow: boolean;
  isSharedInviteInRaid?: boolean;
}): { score: number; isSuspicious: boolean; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];

  if (signals.accountAgeDays < 1) {
    score += 35;
    breakdown.push("Cuenta creada hace < 24h (+35)");
  } else if (signals.accountAgeDays < 7) {
    score += 20;
    breakdown.push("Cuenta creada hace < 7 días (+20)");
  }

  if (signals.hasNoAvatar) {
    score += 15;
    breakdown.push("Sin avatar personalizado (+15)");
  }

  if (signals.isIrregularName) {
    score += 20;
    breakdown.push("Nombre irregular o caracteres zalgo (+20)");
  }

  if (signals.joinedInRaidWindow) {
    score += 25;
    breakdown.push("Ingreso durante ráfaga de raid (+25)");
  }

  if (signals.isSharedInviteInRaid) {
    score += 20;
    breakdown.push("Enlace de invitación compartido (+20)");
  }

  return {
    score,
    isSuspicious: score >= 50,
    breakdown,
  };
}

/**
 * Detección de muro de texto por patrones (saltos de línea o repetición masiva de caracteres)
 */
export function isTextWall(content: string): boolean {
  if (!content) return false;

  const newlines = (content.match(/\n/g) || []).length;
  // Exceso de saltos de línea (10+ saltos es spam visual en cualquier longitud)
  if (newlines >= 10) return true;

  if (content.length >= 150) {
    if (newlines >= 15) return true;

    // Patrón: Un mismo carácter repetido >= 60% en mensaje largo (>= 200 chars)
    if (content.length >= 200) {
      const counts = new Map<string, number>();
      let maxCharCount = 0;
      for (const char of content) {
        if (char === " " || char === "\n") continue;
        const c = (counts.get(char) || 0) + 1;
        counts.set(char, c);
        if (c > maxCharCount) maxCharCount = c;
      }
      if (maxCharCount / content.length >= 0.6) return true;
    }
  }

  return false;
}

export interface MassMentionResult {
  triggered: boolean;
  type: "unauthorized_everyone" | "everyone_ping" | "mass_mentions";
  mentionCount: number;
  action: "delete" | "delete+timeout";
  timeoutMs: number;
  reason: string;
}

/**
 * Evaluación de menciones masivas y @everyone/@here
 */
export function evaluateMassMentions(
  content: string,
  mentions: { everyone: boolean; usersCount: number; rolesCount: number },
  hasMentionEveryonePerm: boolean,
  isRaid: boolean,
): MassMentionResult | null {
  const profile = isRaid ? PROFILES.raid : PROFILES.normal;
  const totalMentions = mentions.usersCount + mentions.rolesCount;

  const containsEveryone = /@(everyone|here)/i.test(content);
  if (containsEveryone) {
    if (mentions.everyone && !hasMentionEveryonePerm) {
      return {
        triggered: true,
        type: "everyone_ping",
        mentionCount: totalMentions,
        action: "delete+timeout",
        timeoutMs: 10 * 60_000,
        reason: "Mención masiva no autorizada (@everyone/@here real)",
      };
    } else if (!mentions.everyone) {
      return {
        triggered: true,
        type: "unauthorized_everyone",
        mentionCount: totalMentions,
        action: "delete",
        timeoutMs: 0,
        reason: "Intento de mención masiva (@everyone/@here texto inerte)",
      };
    }
  }

  if (totalMentions >= profile.mention.limit) {
    const action = isRaid && profile.mention.pingTimeoutMs > 0 ? "delete+timeout" : "delete";
    return {
      triggered: true,
      type: "mass_mentions",
      mentionCount: totalMentions,
      action,
      timeoutMs: profile.mention.pingTimeoutMs,
      reason: `Menciones masivas (${totalMentions} menciones, límite: ${profile.mention.limit})`,
    };
  }

  return null;
}

// Actividad de texto reciente: el VC Thrashing solo cuenta saltos "sin interacción de texto"
const textActivityL1 = new LocalCacheService<{ at: number }>("automod_text_act", {
  max: 10_000,
  ttlMs: 15_000,
});

export function markTextActivity(guildId: string, userId: string): void {
  textActivityL1.set(`${guildId}:${userId}`, { at: Date.now() });
}

export async function checkVoiceThrashing(
  guildId: string,
  userId: string,
): Promise<{ triggered: boolean; stressAdded: number }> {
  const key = `${guildId}:${userId}`;
  if (textActivityL1.get(key)) return { triggered: false, stressAdded: 0 };

  const now = Date.now();
  const entry = voiceThrashL1.get(key);
  const recent = (entry?.times || []).filter((t) => now - t < 15_000);
  recent.push(now);

  if (recent.length >= 4) {
    voiceThrashL1.delete(key);
    await addServerStress(guildId, 25);
    return { triggered: true, stressAdded: 25 };
  }

  voiceThrashL1.set(key, { times: recent });
  return { triggered: false, stressAdded: 0 };
}

/**
 * Nombres irregulares (Pilar 2.1): caracteres invisibles, "zalgo" (marcas combinantes),
 * mayoría de símbolos o rachas largas de dígitos típicas de cuentas generadas.
 */
export function isIrregularName(name: string): boolean {
  if (!name) return false;
  if (/[\u200B-\u200F\u2060-\u2064\uFEFF\u3164\u115F\u1160]/.test(name)) return true;
  const combining = name.normalize("NFD").match(/[\u0300-\u036f\u0489]/g)?.length ?? 0;
  if (combining >= 4) return true;
  if (/\d{5,}/.test(name)) return true;
  const chars = Array.from(name);
  const alnum = chars.filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
  return chars.length >= 3 && alnum / chars.length < 0.5;
}

// Mensajes borrados por el automod (para "Falso Positivo": restaurarlos)
export interface DeletedMessageRecord {
  channelId: string;
  content: string;
  at: number;
}

const deletedMessagesL1 = new LocalCacheService<DeletedMessageRecord[]>(
  "automod_deleted_msgs",
  { max: 2000, ttlMs: 30 * 60 * 1000 },
);

export function rememberDeletedMessage(
  guildId: string,
  userId: string,
  channelId: string,
  content: string,
): void {
  if (!content) return;
  const key = `${guildId}:${userId}`;
  const list = deletedMessagesL1.get(key) ?? [];
  list.push({ channelId, content: content.slice(0, 1800), at: Date.now() });
  deletedMessagesL1.set(key, list.slice(-5));
}

export function takeDeletedMessages(
  guildId: string,
  userId: string,
): DeletedMessageRecord[] {
  const key = `${guildId}:${userId}`;
  const list = deletedMessagesL1.get(key) ?? [];
  deletedMessagesL1.delete(key);
  return list;
}

export function cleanup(): void {
  // No-op mantenido por compatibilidad: LocalCacheService expira entradas por TTL automáticamente.
}

export function getSpamTrackerStats(_guildId: string): {
  users: number;
  entries: number;
} {
  const stats = spamTrackerL1.getStats();
  return { users: stats.size, entries: stats.size };
}


