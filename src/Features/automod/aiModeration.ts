import { GoogleGenerativeAI } from "@google/generative-ai";
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
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { AutomodManager } from "../AutomodManager";
import {
  addServerStress,
  getServerStress,
  rememberDeletedMessage,
  SECURITY_LEVEL_THRESHOLDS,
} from "./automodState";
import type { SecurityLevel } from "../../Database/guild/serverConfig.model";

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

// ─── 2. CIRCUIT BREAKER & FALLBACK REGEX LOCAL (Pilar 7.1) ────────────────
let consecutiveAiFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

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

// ─── 3. MICRO-BATCHING CON GEMINI MODERATION (Pilar 3) ────────────────────
interface PendingModMessage {
  message: Message;
  content: string;
  trusted: boolean;
  image?: { url: string; mimeType: string };
}

const AI_MOD_QUEUE = "ai_moderation";
const MOD_BATCH_WINDOW_MS = 2500;
const MOD_BATCH_MAX = 10;
const MAX_IMAGES_PER_BATCH = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
let batcherInitialized = false;

function getModerationGenAI(): GoogleGenerativeAI | null {
  const key =
    process.env.GEMINI_MODERATION_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/** Descarga una imagen adjunta (Vision/OCR) como base64. Devuelve null si falla o tarda > 5s. */
async function fetchImagePart(
  image: NonNullable<PendingModMessage["image"]>,
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const res = await fetch(image.url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return null;
    return { inlineData: { mimeType: image.mimeType, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

/**
 * Aplica el veredicto: veteranos solo se marcan para revisión manual (mensaje intacto + enlace);
 * el resto recibe tolerancia cero (borrado + aislamiento).
 */
async function applyVerdict(
  guild: Guild,
  item: PendingModMessage,
  reason: string,
  source: string,
): Promise<void> {
  const member = item.message.member;
  if (!member) return;
  const excerpt = (item.content.slice(0, 100) || "(imagen)").replace(/`/g, "'");

  if (item.trusted) {
    await HoshikoLogger.sendLog(
      guild,
      "AUTOMOD",
      `🔎 **Revisión manual (${source}):** Usuario con historial confiable. No se aplicó sanción automática.\n**Veredicto:** ${reason}\n**Extracto:** \`${excerpt}\``,
      item.message.author,
      item.message.url,
    );
    return;
  }

  rememberDeletedMessage(guild.id, member.id, item.message.channelId, item.content);
  await item.message.delete().catch(() => null);
  await AutomodManager.executeAction(
    guild,
    member,
    { type: "mute", duration: 20 * 60 * 1000, reason: `${source}: ${reason}` },
    source,
  );
  await HoshikoLogger.sendLog(
    guild,
    "AUTOMOD",
    `🧠 **${source} (Bajo Estrés):** Mensaje eliminado y usuario aislado.\n**Veredicto:** ${reason}\n**Extracto:** \`${excerpt}\``,
    item.message.author,
  );
}

async function applyRegexFallback(guild: Guild, items: PendingModMessage[]) {
  for (const item of items) {
    const check = evaluateWithLocalRegex(item.content);
    if (check.toxic) {
      await applyVerdict(guild, item, check.reason!, "Filtro de Emergencia");
    }
  }
}

async function flushGuildModBatch(
  _guildId: string,
  items: PendingModMessage[],
): Promise<void> {
  if (items.length === 0) return;

  const guild = items[0].message.guild;
  if (!guild) return;

  const isCircuitOpen = Date.now() < circuitOpenUntil;
  const genAI = !isCircuitOpen ? getModerationGenAI() : null;

  // Circuit Breaker abierto o sin API key → Regex estricto local
  if (!genAI) {
    await applyRegexFallback(guild, items);
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    });

    const payload = items
      .map(
        (it, idx) =>
          `[${idx}] (${it.message.author.id}): ${it.content.slice(0, 220)}${it.image ? " [adjunta imagen]" : ""}`,
      )
      .join("\n");

    const prompt = [
      "Eres un motor de seguridad y moderación de Discord.",
      "Analiza este lote de mensajes enviados durante una alerta de estrés en el servidor.",
      "Detecta leetspeak, discursos de odio ocultos, amenazas reales, phishing semántico, spam coordinado o evasión maliciosa de filtros.",
      "Las imágenes adjuntas van etiquetadas con el índice de su mensaje: lee su texto (OCR) y revisa si contienen estafas, QR sospechosos, odio o contenido explícito.",
      'Responde ÚNICAMENTE con un JSON válido con el formato: {"flagged":[{"index":0,"reason":"motivo breve"}]}',
      'Si ninguno es malicioso, responde: {"flagged":[]}',
      "",
      payload,
    ].join("\n");

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: prompt }];
    const withImages = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it.image)
      .slice(0, MAX_IMAGES_PER_BATCH);
    const imageParts = await Promise.all(
      withImages.map(({ it }) => fetchImagePart(it.image!)),
    );
    imageParts.forEach((part, i) => {
      if (!part) return;
      parts.push({ text: `Imagen del mensaje [${withImages[i].idx}]:` }, part);
    });

    const result = await model.generateContent(parts);
    const rawText = result.response.text().trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { flagged: [] };

    consecutiveAiFailures = 0;

    if (Array.isArray(parsed.flagged)) {
      for (const flag of parsed.flagged) {
        const targetItem = items[flag.index];
        if (!targetItem) continue;
        await applyVerdict(
          guild,
          targetItem,
          flag.reason || "Contenido hostil bajo alerta",
          "IA Moderación",
        );
      }
    }
  } catch {
    consecutiveAiFailures++;
    if (consecutiveAiFailures >= CIRCUIT_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      await HoshikoLogger.log({
        level: LogLevel.WARN,
        context: "Automod/CircuitBreaker",
        message: `Circuit Breaker ABIERTO por 5 min tras ${consecutiveAiFailures} fallos de Gemini. Activando filtro Regex local estricto.`,
        guildId: guild.id,
      });
    }

    // Fallback inmediato sobre el lote actual
    await applyRegexFallback(guild, items);
  }
}

/**
 * Evalúa un mensaje cuando el Medidor de Estrés del servidor supera el umbral de su Perfil de Seguridad.
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

  const stress = await getServerStress(message.guild.id);
  const threshold = SECURITY_LEVEL_THRESHOLDS[securityLevel] ?? 100;

  // Si el servidor está en calma, no gastamos llamadas a IA
  if (stress < threshold) return;

  // Estrés crítico (Nivel 4 al doble de su umbral, o >= 160 pts en cualquier nivel) → El Torniquete
  if ((securityLevel === 4 && stress >= threshold * 2) || stress >= 160) {
    await triggerServerLockdown(
      message.guild,
      `Nivel de estrés crítico alcanzado (${stress} pts en Perfil Nvl ${securityLevel})`,
    );
  }

  if (!batcherInitialized) {
    batcherInitialized = true;
    QueueService.registerBatcher<PendingModMessage>(
      AI_MOD_QUEUE,
      { maxSize: MOD_BATCH_MAX, windowMs: MOD_BATCH_WINDOW_MS },
      flushGuildModBatch,
    );
  }

  const trusted = await isTrustedVeteran(message.author.id);
  QueueService.enqueueBatchItem<PendingModMessage>(
    AI_MOD_QUEUE,
    message.guild.id,
    {
      message,
      content,
      trusted,
      image: attachment
        ? { url: attachment.url, mimeType: attachment.contentType!.split(";")[0] }
        : undefined,
    },
  );
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
  return false;
}

export async function triggerServerLockdown(
  guild: Guild,
  reason: string,
): Promise<boolean> {
  if (await isServerLockedDown(guild.id)) return false;

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return false;

  const everyone = guild.roles.everyone;
  // Si @everyone ya no puede escribir, no hay nada que revocar (ni que restaurar después)
  if (!everyone.permissions.has(PermissionFlagsBits.SendMessages)) return false;

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

  const snapshot = { timestamp: Date.now() };
  lockdownL1.set(guild.id, snapshot);

  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      void redis
        .set(buildRedisKey("lockdown", guild.id), JSON.stringify(snapshot), "EX", 86400)
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
 * Restaura SendMessages en @everyone. Devuelve true si había un lockdown activo y se restauró.
 */
export async function liftServerLockdown(
  guild: Guild,
  moderatorTag?: string,
): Promise<boolean> {
  const wasLocked = await isServerLockedDown(guild.id);

  lockdownL1.delete(guild.id);
  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      void redis.del(buildRedisKey("lockdown", guild.id)).catch(() => undefined);
    }
  }

  await addServerStress(guild.id, -200);
  if (!wasLocked) return false;

  const everyone = guild.roles.everyone;
  return everyone
    .setPermissions(
      new PermissionsBitField(everyone.permissions).add(
        PermissionFlagsBits.SendMessages,
      ),
      `Lockdown levantado por ${moderatorTag || "Hoshiko"}`,
    )
    .then(() => true)
    .catch(() => false);
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
