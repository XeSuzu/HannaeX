import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  User,
} from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IRaidEpisode, RaidEpisodeModel } from "./raidEpisode.model";

// ─── 1. CACHÉ EN MEMORIA PARA COOLDOWNS Y USUARIOS SEGUROS ─────────────────
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleTTLMap<T> {
  private map = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

const episodeCooldownCache = new SimpleTTLMap<{
  episodeId: string;
  timestamp: number;
}>(5 * 60 * 1000);

const activeEpisodesMemory = new SimpleTTLMap<any>(24 * 60 * 60 * 1000);
const safeUsersCache = new SimpleTTLMap<boolean>(2 * 60 * 60 * 1000);
const safeFingerprintsCache = new SimpleTTLMap<boolean>(2 * 60 * 60 * 1000);

export function registerActiveEpisode(episodeId: string, episodeDoc: any): void {
  activeEpisodesMemory.set(episodeId, episodeDoc);
}

export type RaidAlertSender = (
  guild: any,
  channelName: string,
  embed: any,
  components: any[],
) => Promise<void>;

let alertSender: RaidAlertSender | null = null;
export function setAlertSender(sender: RaidAlertSender | null): void {
  alertSender = sender;
}

export function isUserSafe(guildId: string, userId: string): boolean {
  return Boolean(safeUsersCache.get(`${guildId}:${userId}`));
}

export function markUserSafe(
  guildId: string,
  userId: string,
  ttlMs = 2 * 60 * 60 * 1000,
): void {
  safeUsersCache.set(`${guildId}:${userId}`, true, ttlMs);
}

export function isFingerprintSafe(
  guildId: string,
  fingerprint: string,
): boolean {
  return Boolean(safeFingerprintsCache.get(`${guildId}:${fingerprint}`));
}

export function markFingerprintSafe(
  guildId: string,
  fingerprint: string,
  ttlMs = 2 * 60 * 60 * 1000,
): void {
  safeFingerprintsCache.set(`${guildId}:${fingerprint}`, true, ttlMs);
}

// ─── 2. BANEOS EN LOTES (Chunking) ─────────────────────────────────────────
const BAN_CHUNK_SIZE = 5;
const BAN_CHUNK_PAUSE_MS = 1500;

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

// ─── 3. ANÁLISIS FORENSE CON IA ────────────────────────────────────────────
export interface RaidSuspectInfo {
  id: string;
  username: string;
  accountAgeDays: number;
  joinedSecondsAgo: number;
  inviteCode?: string;
  sampleText?: string;
}

export async function analyzeRaidWithAi(
  suspects: RaidSuspectInfo[],
): Promise<{
  summary: string;
  pattern: string;
  recommendedAction: "timeout" | "ban";
  confidence: number;
}> {
  const fallback = {
    summary: `Incursión detectada con ${suspects.length} cuentas simultáneas sospechosas.`,
    pattern: "Flujo anómalo de ingresos / repetición coordinada",
    recommendedAction: suspects.length >= 8 ? ("ban" as const) : ("timeout" as const),
    confidence: 0.9,
  };

  const apiKey =
    process.env.GEMINI_MODERATION_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    });

    const suspectList = suspects
      .slice(0, 15)
      .map(
        (s, i) =>
          `[${i + 1}] ID:${s.id} User:${s.username} (Cuenta: ${s.accountAgeDays.toFixed(1)}d, entró hace ${s.joinedSecondsAgo}s)${s.sampleText ? ` Texto: "${s.sampleText.slice(0, 60)}"` : ""}`,
      )
      .join("\n");

    const prompt = [
      "Eres un analista de ciberseguridad forense para Discord.",
      "Analiza el siguiente grupo de cuentas involucradas en una alerta de raid.",
      "Identifica qué tienen en común y recomienda la mejor acción de contención.",
      "Datos de los sospechosos:",
      suspectList,
      'Responde ÚNICAMENTE en JSON: { "summary": string, "pattern": string, "recommendedAction": "timeout" | "ban", "confidence": number }',
    ].join("\n");

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 140) : fallback.summary,
      pattern: typeof parsed.pattern === "string" ? parsed.pattern.slice(0, 140) : fallback.pattern,
      recommendedAction: parsed.recommendedAction === "ban" ? "ban" : "timeout",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
    };
  } catch {
    return fallback;
  }
}

// ─── 4. DISPARADOR DE ALERTA DE RAID ──────────────────────────────────────
export async function triggerRaidAlert(params: {
  guild: any;
  suspects: RaidSuspectInfo[];
  detectedInvite?: string;
  sampleText?: string;
}): Promise<any> {
  const { guild, suspects, detectedInvite, sampleText } = params;
  if (!suspects || suspects.length === 0) return null;

  const guildId = guild.id;
  const cooldownKey = guildId;
  const existingCooldown = episodeCooldownCache.get(cooldownKey);

  if (existingCooldown) {
    const activeEp = activeEpisodesMemory.get(existingCooldown.episodeId);
    if (activeEp) {
      const newIds = suspects
        .map((s) => s.id)
        .filter((id) => !(activeEp.suspectIds || []).includes(id));
      if (newIds.length > 0) {
        activeEp.suspectIds = [...(activeEp.suspectIds || []), ...newIds];
        activeEpisodesMemory.set(activeEp.episodeId, activeEp);
        void RaidEpisodeModel.updateOne(
          { episodeId: activeEp.episodeId },
          { $addToSet: { suspectIds: { $each: newIds } } },
        ).catch(() => null);
      }
      return activeEp;
    }
  }

  const episodeId = `raid_${guildId}_${Date.now()}`;
  const suspectIds = Array.from(new Set(suspects.map((s) => s.id)));

  const analysis = await analyzeRaidWithAi(suspects);
  const avgAgeDays =
    suspects.reduce((acc, s) => acc + s.accountAgeDays, 0) /
    (suspects.length || 1);

  const detectedSampleText =
    sampleText || suspects.find((s) => s.sampleText)?.sampleText || null;

  let episodeDoc: any;
  try {
    episodeDoc = await RaidEpisodeModel.create({
      episodeId,
      guildId,
      suspectIds,
      commonMetadata: {
        accountAgeAvgDays: Math.round(avgAgeDays * 10) / 10,
        sharedPattern: analysis.pattern,
        detectedInvite: detectedInvite || null,
        sampleText: detectedSampleText,
      },
      recommendation: analysis.recommendedAction === "ban" ? "Banear raiders" : "Aislar raiders (1h)",
      status: "active",
    });
  } catch {
    episodeDoc = {
      episodeId,
      guildId,
      suspectIds,
      commonMetadata: {
        accountAgeAvgDays: Math.round(avgAgeDays * 10) / 10,
        sharedPattern: analysis.pattern,
        detectedInvite: detectedInvite || null,
        sampleText: detectedSampleText,
      },
      recommendation: analysis.recommendedAction === "ban" ? "Banear raiders" : "Aislar raiders (1h)",
      status: "active",
      createdAt: new Date(),
    };
  }

  activeEpisodesMemory.set(episodeId, episodeDoc);
  episodeCooldownCache.set(cooldownKey, {
    episodeId,
    timestamp: Date.now(),
  });

  if (alertSender) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 ALERTA DE RAID DETECTADA")
      .setColor(0xed4245)
      .setDescription(`Se detectó una incursión anómala con ${suspectIds.length} sospechosos.`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid_act:apply:${episodeId}`)
        .setLabel("Aplicar Acción")
        .setStyle(ButtonStyle.Danger),
    );

    await alertSender(guild, "modlog", embed, [row]).catch(() => null);
  }

  return episodeDoc;
}

// ─── 5. JERARQUÍA Y PERMISOS ──────────────────────────────────────────────
export function canModerateTarget(
  me: { permissions: { has: (p: any) => boolean }; roles: { highest: { position: number } } },
  target: { permissions?: { has: (p: any) => boolean }; roles: { highest: { position: number } } },
): boolean {
  if (target.permissions?.has(PermissionFlagsBits.Administrator)) return false;
  return me.roles.highest.position > target.roles.highest.position;
}

// ─── 6. EJECUTOR DE ACCIONES DE RAID ──────────────────────────────────────
export async function executeRaidAction(params: {
  guild: any;
  episodeId: string;
  action: "apply" | "timeout" | "ban" | "undo";
  moderator: any;
}): Promise<{ success: boolean; message: string; affectedCount: number }> {
  const { guild, episodeId, action, moderator } = params;
  let episode = activeEpisodesMemory.get(episodeId);

  if (!episode) {
    episode = (await RaidEpisodeModel.findOne({ episodeId }).lean().catch(() => null)) as any;
  }

  if (!episode) {
    return {
      success: false,
      message: `❌ No se encontró el episodio de raid \`${episodeId}\`.`,
      affectedCount: 0,
    };
  }

  const modTag = moderator.user?.tag || moderator.tag || moderator.id;
  const modId = moderator.id;
  const targetIds: string[] =
    Array.isArray(episode.suspectIds) && episode.suspectIds.length > 0
      ? episode.suspectIds
      : Array.isArray(episode.suspects)
        ? episode.suspects.map((s: any) => s.id).filter(Boolean)
        : [];

  if (action === "undo") {
    let revertedCount = 0;
    for (const userId of targetIds) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.isCommunicationDisabled()) {
        await member.timeout(null, `Raid deshecho por ${modTag}`).catch(() => null);
        revertedCount++;
      }
      if (guild.bans?.remove) {
        await guild.bans.remove(userId, `Raid deshecho por ${modTag}`).catch(() => null);
        revertedCount++;
      }
      markUserSafe(guild.id, userId, 2 * 60 * 60 * 1000);
    }

    if (episode.commonMetadata?.sampleText) {
      markFingerprintSafe(guild.id, episode.commonMetadata.sampleText, 2 * 60 * 60 * 1000);
    }

    episode.status = "reverted";
    activeEpisodesMemory.set(episodeId, episode);

    void RaidEpisodeModel.updateOne(
      { episodeId },
      { status: "reverted", revertedBy: modId, revertedAt: new Date() },
    ).catch(() => null);

    return {
      success: true,
      message: `↩️ **Raid deshecho:** Se restauraron ${revertedCount} sanciones.`,
      affectedCount: revertedCount,
    };
  }

  const eligibleIds: string[] = [];
  const me = guild.members?.me || {
    permissions: { has: () => true },
    roles: { highest: { position: 999 } },
  };

  for (const id of targetIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member && !canModerateTarget(me, member)) continue;
    eligibleIds.push(id);
  }

  if (action === "ban" || (action === "apply" && episode.recommendation?.toLowerCase().includes("ban"))) {
    const banned = await banInChunks(eligibleIds, async (id) => {
      await guild.members.ban(id, {
        deleteMessageSeconds: 3600,
        reason: `Hoshiko Security Anti-Raid (${episodeId}) por ${modTag}`,
      });
    });

    episode.status = "applied";
    episode.appliedAction = "ban";
    activeEpisodesMemory.set(episodeId, episode);

    void RaidEpisodeModel.updateOne(
      { episodeId },
      { status: "applied", appliedAction: "ban", appliedBy: modId, appliedAt: new Date() },
    ).catch(() => null);

    return {
      success: true,
      message: `🔨 **Mitigación completada:** ${banned} cuentas baneadas.`,
      affectedCount: banned,
    };
  } else {
    let muted = 0;
    for (const id of eligibleIds) {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.timeout) {
        await member.timeout(60 * 60 * 1000, `Hoshiko Security Anti-Raid por ${modTag}`).catch(() => null);
        muted++;
      }
    }

    episode.status = "applied";
    episode.appliedAction = "timeout";
    activeEpisodesMemory.set(episodeId, episode);

    void RaidEpisodeModel.updateOne(
      { episodeId },
      { status: "applied", appliedAction: "timeout", appliedBy: modId, appliedAt: new Date() },
    ).catch(() => null);

    return {
      success: true,
      message: `🔇 **Mitigación completada:** ${muted} cuentas aisladas 1 hora.`,
      affectedCount: muted,
    };
  }
}
