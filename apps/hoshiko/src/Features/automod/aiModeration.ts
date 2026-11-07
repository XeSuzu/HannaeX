import {
  EmbedBuilder,
  Guild,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { QueueService } from "../../App/infrastructure/queue/QueueService";
import { RedisClientService } from "../../App/infrastructure/redis/RedisClient";
import GlobalProfile from "../../Database/moderation/globalProfile.model";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { AutomodManager } from "../AutomodManager";
import {
  buildNormalizedFingerprint,
  isUserSafe,
} from "./automodState";
import type { SecurityLevel } from "../../Database/guild/serverConfig.model";
import {
  judgeMessageWithAi,
  resolvePolicyAction,
  executeAiModerationDecision,
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
  /(?:n[i1l!|]gg[e3a@4]r|f[a@4]gg[o0]t|\bk[y1]s\b|k[i1]ll\s*y[o0]urs[e3]lf|\bsu[i1]c[i1]d[a@4]t[e3]\b|\bm[a@4]t[a@4]t[e3]\b|d[i1]sc[o0]rd\s*\.\s*gg\/[^\s]+|fr[e3][e3]\s*n[i1]tr[o0]|n[i1]tr[o0]\s*gr[a@4]t[i1]s|st[e3][a@4]m\s*g[i1]ft|cr[y1]pt[o0]\s*g[i1]v[e3][a@4]w[a@4]y|\bp[a@4]s[e3]n\s*cp\b|\bd[o0]xx[e3][a@4]r\b)/i;

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
 * política determinista y enrutamiento a #message-review.
 */
export async function evaluateHighStressMessage(
  message: Message,
  securityLevel: SecurityLevel = 2,
  preloadedSettings?: any,
): Promise<void> {
  if (!message.guild || !message.member || message.author?.bot) return;
  if (
    message.guild.ownerId === message.author.id ||
    message.member.permissions?.has?.(PermissionFlagsBits.ManageMessages) ||
    message.member.permissions?.has?.(PermissionFlagsBits.Administrator)
  ) {
    return;
  }

  const guildId = message.guild.id;
  if (isUserSafe(guildId, message.author.id)) return;

  const content = message.content?.trim() ?? "";
  const attachment = message.attachments?.find?.(
    (a) => !!a.contentType?.startsWith("image/") && a.size <= MAX_IMAGE_BYTES,
  );
  if (content.length < 4 && !attachment) return;

  const settings =
    preloadedSettings ?? (await SettingsManager.getSettings(guildId));

  // Respetar canales y roles exentos
  const channelId = message.channelId || message.channel?.id || "";
  if (channelId && (settings?.exemptChannels || []).includes(channelId)) {
    return;
  }

  const memberRoles: any = message.member?.roles?.cache;
  const hasExemptRole = memberRoles
    ? typeof memberRoles.some === "function"
      ? memberRoles.some((r: any) => (settings?.exemptRoles || []).includes(r.id))
      : Array.from(memberRoles.values ? memberRoles.values() : memberRoles).some(
          (r: any) => (settings?.exemptRoles || []).includes(r.id),
        )
    : false;
  if (hasExemptRole) return;

  // [SEPARACIÓN ARQUITECTÓNICA]: En Hoshiko normal no existe Modo Raid autónomo (delegado a apps/hoshiko-security).
  // La Moderación IA de Hoshiko actúa únicamente cuando el módulo aiModeration está activo en el servidor
  // y enruta las detecciones a #message-review para revisión humana.
  const aiModuleEnabled = Boolean(settings?.securityModules?.aiModeration);
  if (!aiModuleEnabled) return;

  const isRaid = false;

  // Contexto de antigüedad del miembro
  const now = Date.now();
  const accountAgeDays = message.author.createdTimestamp
    ? (now - message.author.createdTimestamp) / 86_400_000
    : 30;
  const joinAgeHours = message.member.joinedTimestamp
    ? (now - message.member.joinedTimestamp) / 3_600_000
    : 999;

  // Contexto de canal: últimos 3 mensajes (sanitizados y sin el actual)
  const channelContext: string[] = [];
  if (
    message.channel &&
    "messages" in message.channel &&
    message.channel.messages?.cache
  ) {
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
    suggestedAction: verdict.suggested_action,
  });

  // Por defecto usar "enforce" para que las revisiones lleguen efectivamente a #message-review
  const aiMode = settings?.securityModules?.aiMode ?? "enforce";

  await executeAiModerationDecision({
    guild: message.guild,
    message,
    decision: verdict,
    action,
    aiMode,
    isRaid,
  });
}

