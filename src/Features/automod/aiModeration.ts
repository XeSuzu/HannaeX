import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  Message,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { QueueService } from "../../App/infrastructure/queue/QueueService";
import { RedisClientService } from "../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../App/infrastructure/redis/RedisKeys";
import GlobalProfile from "../../Database/moderation/globalProfile.model";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { AutomodManager } from "../AutomodManager";
import {
  addServerStress,
  buildNormalizedFingerprint,
  getServerStress,
  isRaidActive,
  rememberDeletedMessage,
  SECURITY_LEVEL_THRESHOLDS,
} from "./automodState";
import type { SecurityLevel } from "../../Database/guild/serverConfig.model";
import {
  judgeMessageWithAi,
  resolvePolicyAction,
  executeAiModerationDecision,
  shouldEvaluateWithAi,
} from "./aiJudge";

export * from "./aiJudge";

// ─── 1. TRUST FACTOR (Pilar 3.1) ───────────────────────────────────────────
// Veteranos (historial impecable) → revisión manual. Resto → tolerancia cero.
const trustL1 = new LocalCacheService<{ trusted: boolean }>("automod_trust", {
  max: 3000,
  ttlMs: 300_000, // 5 min
});

async function isTrustedVeteran(userId: string): Promise<boolean> {
  const cached = trustL1.get(userId);
  if (cached) return cached.trusted;

  try {
    const profile = await GlobalProfile.findOne({ userId })
      .select("level reputation")
      .lean();
    const trusted = Boolean(
      profile && (profile.level >= 15 || profile.reputation >= 5),
    );
    trustL1.set(userId, { trusted });
    return trusted;
  } catch {
    return false;
  }
}

// ─── 2. FALLBACK REGEX LOCAL (Pilar 7.1) ──────────────────────────────────
const STRICT_EVASION_REGEX =
  /(?:n[i1l!|]gg[e3a@4]r|f[a@4]gg[o0]t|\bk[y1]s\b|d[i1]sc[o0]rd\s*\.\s*gg\/[^\s]+|fr[e3][e3]\s*n[i1]tr[o0]|st[e3][a@4]m\s*g[i1]ft|cr[y1]pt[o0]\s*g[i1]v[e3][a@4]w[a@4]y)/i;

export function evaluateWithLocalRegex(content: string): {
  toxic: boolean;
  reason?: string;
} {
  // Normalizar acentos y caracteres invisibles usados para evadir filtros
  const cleaned = content
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u200B-\u200D\uFEFF]/g, "");

  if (STRICT_EVASION_REGEX.test(cleaned)) {
    return {
      toxic: true,
      reason: "Patrón tóxico/scam detectado por filtro heurístico de respaldo",
    };
  }
  return { toxic: false };
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Evalúa un mensaje utilizando el Juez IA con compuerta de seguridad,
 * política determinista y modo sombra/enforce.
 */
export async function evaluateHighStressMessage(
  message: Message,
  securityLevel: SecurityLevel = 2,
): Promise<void> {
  if (!message.guild || !message.member || message.author.bot) return;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const content = message.content?.trim() ?? "";
  const attachment = message.attachments.find(
    (a) => !!a.contentType?.startsWith("image/") && a.size <= MAX_IMAGE_BYTES,
  );
  if (content.length < 4 && !attachment) return;

  const guildId = message.guild.id;
  const settings = await SettingsManager.getSettings(guildId);
  const isRaid = await isRaidActive(guildId);
  const stress = await getServerStress(guildId);
  const threshold = SECURITY_LEVEL_THRESHOLDS[securityLevel] ?? 100;

  // Estrés crítico (Nivel 4 al doble de su umbral, o >= 160 pts en cualquier nivel) → El Torniquete
  if ((securityLevel === 4 && stress >= threshold * 2) || stress >= 160) {
    await triggerServerLockdown(
      message.guild,
      `Nivel de estrés crítico alcanzado (${stress} pts en Perfil Nvl ${securityLevel})`,
    );
  }

  // Compuerta: verificar si el mensaje califica para evaluación con IA
  const now = Date.now();
  const accountAgeDays = (now - message.author.createdTimestamp) / (86_400_000);
  const joinAgeHours = message.member.joinedTimestamp
    ? (now - message.member.joinedTimestamp) / (3_600_000)
    : 999;
  const isNewMember = accountAgeDays < 7 || joinAgeHours < 24;

  const shouldEval = shouldEvaluateWithAi({
    isRaid,
    stress,
    stressThreshold: threshold,
    isNewMember,
    hasUnresolvedSuspicion: false,
    isReport: false,
  });

  // Si no cumple compuerta y el módulo no está forzado, no consumimos IA
  if (!shouldEval && !settings?.securityModules?.aiModeration) return;

  // Contexto de canal: últimos 3 mensajes (sanitizados y sin el actual)
  const channelContext: string[] = [];
  if ("messages" in message.channel && message.channel.messages?.cache) {
    const recent = Array.from(message.channel.messages.cache.values())
      .filter((m) => m.id !== message.id && m.content)
      .slice(-3);
    for (const m of recent) {
      channelContext.push(`${m.author.username}: ${m.content.slice(0, 100)}`);
    }
  }

  const fingerprint =
    buildNormalizedFingerprint(content) || content.toLowerCase();

  const { verdict } = await judgeMessageWithAi({
    guildId,
    content,
    authorContext: { accountAgeDays, joinAgeHours },
    channelContext,
    serverRules: settings?.rules ?? [],
    fingerprint,
    staffFeedback: settings?.staffFeedback,
  });

  const action = resolvePolicyAction({
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    isRaid,
  });

  const aiMode = settings?.securityModules?.aiMode ?? "shadow";

  await executeAiModerationDecision({
    guild: message.guild,
    message,
    decision: verdict,
    action,
    aiMode,
    isRaid,
  });
}

// ─── 4. EL TORNIQUETE: EMERGENCY LOCKDOWN & RESTORE (Pilar 7.2) ───────────
// Una sola llamada a la API: revoca SendMessages en el rol @everyone.
const lockdownL1 = new LocalCacheService<{ timestamp: number }>(
  "guild_lockdown",
  { max: 500, ttlMs: 24 * 60 * 60 * 1000 },
);

export async function isServerLockedDown(guildId: string): Promise<boolean> {
  if (lockdownL1.get(guildId)) return true;
  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      try {
        const raw = await redis.get(buildRedisKey("lockdown", guildId));
        if (raw) {
          lockdownL1.set(guildId, JSON.parse(raw));
          return true;
        }
      } catch {}
    }
  }

  // Fallback a MongoDB (sobrevive a reinicios completos sin Redis)
  try {
    const settings = await SettingsManager.getSettings(guildId);
    if (settings?.lockdownState?.active) {
      lockdownL1.set(guildId, {
        timestamp: settings.lockdownState.lockedAt
          ? new Date(settings.lockdownState.lockedAt).getTime()
          : Date.now(),
      });
      return true;
    }
  } catch {}

  return false;
}

export async function triggerServerLockdown(
  guild: Guild,
  reason: string,
  raidDurationMs = 30 * 60 * 1000,
): Promise<boolean> {
  if (await isServerLockedDown(guild.id)) return false;

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return false;

  const everyone = guild.roles.everyone;
  const previousSendMessages = everyone.permissions.has(
    PermissionFlagsBits.SendMessages,
  );

  // Si @everyone podía escribir, le revocamos exclusivamente ese bit
  if (previousSendMessages) {
    const ok = await everyone
      .setPermissions(
        new PermissionsBitField(everyone.permissions).remove(
          PermissionFlagsBits.SendMessages,
        ),
        `Hoshiko Torniquete (Lockdown): ${reason}`,
      )
      .then(() => true)
      .catch(() => false);
    if (!ok) return false;
  }

  const now = Date.now();
  const snapshot = { timestamp: now };
  lockdownL1.set(guild.id, snapshot);

  // Persistir en Mongo (Principio 4.2: recuperación quirúrgica sin pisar roles)
  await SettingsManager.updateSettings(guild.id, {
    lockdownState: {
      active: true,
      previousSendMessages,
      reason,
      lockedAt: new Date(now),
      raidUntil: new Date(now + raidDurationMs),
    },
  });

  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      void redis
        .set(
          buildRedisKey("lockdown", guild.id),
          JSON.stringify(snapshot),
          "EX",
          86400,
        )
        .catch(() => undefined);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🚨 EL TORNIQUETE ACTIVADO (Emergency Lockdown)")
    .setDescription(
      `Se detectó una anomalía crítica y Hoshiko revocó **Enviar Mensajes** al rol \`@everyone\` para contener el ataque.\n\n**Motivo:** ${reason}\n\nCuando la situación esté controlada, pulsa el botón inferior para restaurar el permiso.`,
    )
    .setColor(0xed4245)
    .setTimestamp()
    .setFooter({ text: "Hoshiko Security Center • Protocolo Torniquete" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("modlog_act:unlockdown:0")
      .setLabel("Levantar Lockdown")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("modlog_act:banraid:0")
      .setLabel("Banear raiders")
      .setEmoji("🔨")
      .setStyle(ButtonStyle.Danger),
  );

  await HoshikoLogger.sendToChannel(guild, "modlog", embed, [row]);
  return true;
}

/**
 * Restaura SendMessages en @everyone quirúrgica e idempotentemente.
 * Devuelve true si se restauró o si el servidor ya está desbloqueado.
 */
export async function liftServerLockdown(
  guild: Guild,
  moderatorTag?: string,
): Promise<boolean> {
  const wasLocked = await isServerLockedDown(guild.id);
  const settings = await SettingsManager.getSettings(guild.id);
  const hadSendMessages = settings?.lockdownState?.previousSendMessages ?? true;

  lockdownL1.delete(guild.id);
  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      void redis.del(buildRedisKey("lockdown", guild.id)).catch(() => undefined);
    }
  }

  // Limpiar estado en Mongo
  await SettingsManager.updateSettings(guild.id, {
    lockdownState: {
      active: false,
      previousSendMessages: null,
      reason: null,
      lockedAt: null,
      raidUntil: null,
    },
  });

  await addServerStress(guild.id, -200);

  const everyone = guild.roles.everyone;
  const currentCanSend = everyone.permissions.has(
    PermissionFlagsBits.SendMessages,
  );

  // Si no puede escribir y previamente podía, se lo devolvemos quirúrgicamente
  if (!currentCanSend && hadSendMessages) {
    const ok = await everyone
      .setPermissions(
        new PermissionsBitField(everyone.permissions).add(
          PermissionFlagsBits.SendMessages,
        ),
        `Lockdown levantado por ${moderatorTag || "Hoshiko"}`,
      )
      .then(() => true)
      .catch(() => false);
    return ok;
  }

  return wasLocked || !currentCanSend;
}

// ─── 5. BANEOS MASIVOS POR LOTES (Chunking, Pilar 7.2) ────────────────────
const BAN_CHUNK_SIZE = 5;
const BAN_CHUNK_PAUSE_MS = 1500;

/** Selecciona sospechosos de raid: entraron hace < 15 min con cuentas de < 7 días. */
export function selectRaidSuspects(
  members: Iterable<{
    id: string;
    joinedTimestamp: number | null;
    user: { bot: boolean; createdTimestamp: number };
  }>,
  now = Date.now(),
): string[] {
  const ids: string[] = [];
  for (const m of members) {
    if (m.user.bot) continue;
    const joinedRecently = (m.joinedTimestamp ?? 0) > now - 15 * 60 * 1000;
    const youngAccount = m.user.createdTimestamp > now - 7 * 86_400_000;
    if (joinedRecently && youngAccount) ids.push(m.id);
  }
  return ids;
}

/**
 * Banea en lotes de 5 con pausas de 1.5s para no disparar el rate limit global de Discord.
 */
export async function banInChunks(
  ids: string[],
  banOne: (id: string) => Promise<unknown>,
  pauseMs = BAN_CHUNK_PAUSE_MS,
): Promise<number> {
  let banned = 0;
  for (let i = 0; i < ids.length; i += BAN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + BAN_CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map((id) => banOne(id).then(() => 1, () => 0)),
    );
    banned += results.reduce<number>((a, b) => a + b, 0);
    if (i + BAN_CHUNK_SIZE < ids.length) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return banned;
}

export async function banRecentRaiders(
  guild: Guild,
  moderatorTag: string,
): Promise<{ found: number; banned: number }> {
  const candidates = guild.members.cache.filter(
    (m) => m.bannable && !m.permissions.has(PermissionFlagsBits.ManageMessages),
  );
  const ids = selectRaidSuspects(candidates.values());
  const banned = await banInChunks(ids, (id) =>
    guild.members.ban(id, {
      deleteMessageSeconds: 3600,
      reason: `Hoshiko Anti-Raid (lotes) por ${moderatorTag}`,
    }),
  );
  return { found: ids.length, banned };
}
