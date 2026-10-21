import { GoogleGenerativeAI } from "@google/generative-ai";
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
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { createCase } from "../../Database/moderation/case.model";
import {
  IRaidEpisode,
  RaidEpisodeModel,
} from "../../Database/moderation/raidEpisode.model";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { banInChunks } from "./aiModeration";
import { isCircuitBreakerOpen, isDailyBudgetExhausted } from "./aiJudge";

// ─── 1. CACHÉ Y COOLDOWN DE EPISODIOS ─────────────────────────────────────
const episodeCooldownCache = new LocalCacheService<{
  episodeId: string;
  timestamp: number;
}>("automod_raid_cooldown", { max: 500, ttlMs: 5 * 60 * 1000 });

const activeEpisodesMemory = new LocalCacheService<IRaidEpisode>(
  "automod_raid_episodes",
  { max: 500, ttlMs: 24 * 60 * 60 * 1000 },
);

// Marcar usuarios y huellas como seguros temporalmente tras un "Deshacer"
const safeUsersCache = new LocalCacheService<{ safeUntil: number }>(
  "automod_safe_users",
  { max: 5000, ttlMs: 2 * 60 * 60 * 1000 },
);

const safeFingerprintsCache = new LocalCacheService<{ safeUntil: number }>(
  "automod_safe_fingerprints",
  { max: 5000, ttlMs: 2 * 60 * 60 * 1000 },
);

export function isUserSafe(guildId: string, userId: string): boolean {
  return Boolean(safeUsersCache.get(`${guildId}:${userId}`));
}

export function markUserSafe(
  guildId: string,
  userId: string,
  ttlMs = 2 * 60 * 60 * 1000,
): void {
  safeUsersCache.set(`${guildId}:${userId}`, { safeUntil: Date.now() + ttlMs });
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
  safeFingerprintsCache.set(`${guildId}:${fingerprint}`, {
    safeUntil: Date.now() + ttlMs,
  });
}

// ─── 2. ANÁLISIS DE RAID CON IA (UNA SOLA LLAMADA) ─────────────────────────

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
  if (!apiKey || isCircuitBreakerOpen()) {
    return fallback;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    });

    const suspectList = suspects
      .slice(0, 15)
      .map(
        (s, i) =>
          `[${i + 1}] ID:${s.id} User:${s.username} (Cuenta creada hace ${s.accountAgeDays.toFixed(1)} días, entró hace ${s.joinedSecondsAgo}s)${s.sampleText ? ` Texto: "${s.sampleText.slice(0, 60)}"` : ""}`,
      )
      .join("\n");

    const prompt = [
      "Eres un analista de ciberseguridad forense para Discord.",
      "Analiza el siguiente grupo de cuentas involucradas en una alerta de raid.",
      "Identifica qué tienen en común (edad de cuenta, nombres, invitaciones o texto repetido) y recomienda la mejor acción de contención.",
      "",
      "Datos de los sospechosos:",
      suspectList,
      "",
      'Responde ÚNICAMENTE en JSON con el siguiente formato:',
      '{',
      '  "summary": "resumen del ataque en máx 120 caracteres",',
      '  "pattern": "qué tienen en común (ej. cuentas de <24h con nombres alfanuméricos)",',
      '  "recommendedAction": "timeout" | "ban",',
      '  "confidence": 0.0 a 1.0',
      '}',
    ].join("\n");

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);
    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 140)
          : fallback.summary,
      pattern:
        typeof parsed.pattern === "string"
          ? parsed.pattern.slice(0, 140)
          : fallback.pattern,
      recommendedAction:
        parsed.recommendedAction === "ban" ? "ban" : "timeout",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
    };
  } catch {
    return fallback;
  }
}

// ─── 3. DISPARADOR DE ALERTA DE RAID (UN SOLO MENSAJE POR EPISODIO) ────────

export async function triggerRaidAlert(params: {
  guild: Guild;
  suspects: RaidSuspectInfo[];
  detectedInvite?: string;
  sampleText?: string;
}): Promise<IRaidEpisode | null> {
  const { guild, suspects, detectedInvite, sampleText } = params;
  if (!suspects || suspects.length === 0) return null;

  const guildId = guild.id;
  const cooldownKey = guildId;
  const existingCooldown = episodeCooldownCache.get(cooldownKey);

  // Si ya hay un episodio activo dentro de la ventana de cooldown, agregamos los nuevos sospechosos
  if (existingCooldown) {
    const activeEp = activeEpisodesMemory.get(existingCooldown.episodeId);
    if (activeEp) {
      const newIds = suspects
        .map((s) => s.id)
        .filter((id) => !activeEp.suspectIds.includes(id));
      if (newIds.length > 0) {
        activeEp.suspectIds.push(...newIds);
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

  // Análisis forense con IA (una sola llamada)
  const analysis = await analyzeRaidWithAi(suspects);

  const avgAgeDays =
    suspects.reduce((acc, s) => acc + s.accountAgeDays, 0) /
    (suspects.length || 1);

  const detectedSampleText =
    sampleText || suspects.find((s) => s.sampleText)?.sampleText || null;

  // Persistir en MongoDB
  let episodeDoc: IRaidEpisode;
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
    } as any;
  }

  activeEpisodesMemory.set(episodeId, episodeDoc);
  episodeCooldownCache.set(cooldownKey, {
    episodeId,
    timestamp: Date.now(),
  });

  // Construir el Embed y los botones de acción explícita
  const accountsPreview = suspectIds
    .slice(0, 10)
    .map((id) => `<@${id}>`)
    .join(", ");
  const accountsCountText =
    suspectIds.length > 10
      ? `${accountsPreview} *(y ${suspectIds.length - 10} más)*`
      : accountsPreview;

  const embed = new EmbedBuilder()
    .setTitle(`🚨 Alerta de Raid Coordinado (#${episodeId.slice(-6)})`)
    .setColor(0xed4245)
    .setDescription(
      `Se ha detectado una incursión coordinada o anomalía masiva de cuentas.\n\n` +
        `**Diagnóstico IA:** ${analysis.summary}\n` +
        `**Cuentas involucradas (${suspectIds.length}):** ${accountsCountText}\n\n` +
        `**Patrón común:** ${analysis.pattern}\n` +
        `**Antigüedad media:** \`${avgAgeDays.toFixed(1)} días\`\n` +
        (detectedInvite ? `**Invitación usada:** \`${detectedInvite}\`\n` : "") +
        (sampleText ? `**Texto detectado:** \`${sampleText.slice(0, 100)}\`\n` : "") +
        `\n**Acción recomendada:** **${analysis.recommendedAction === "ban" ? "Banear raiders" : "Aislar cuentas (1h)"}**`,
    )
    .setFooter({
      text: "Hoshiko Anti-Raid • Lista explícita de IDs • Acciones reversibles",
    })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`raid_act:apply:${episodeId}`)
      .setLabel("Aplicar Recomendación")
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`raid_act:ban:${episodeId}`)
      .setLabel("Banear raiders")
      .setEmoji("🔨")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`raid_act:undo:${episodeId}`)
      .setLabel("Deshacer")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  await HoshikoLogger.sendToChannel(guild, "modlog", embed, [row]);
  return episodeDoc;
}

// ─── 4. VERIFICACIÓN DE JERARQUÍA Y PERMISOS ──────────────────────────────

export function canModerateTarget(
  me: GuildMember,
  target: GuildMember,
): boolean {
  if (target.id === target.guild.ownerId) return false;
  if (target.permissions.has(PermissionFlagsBits.Administrator)) return false;
  if (target.roles.highest.position >= me.roles.highest.position) return false;
  return true;
}

// ─── 5. EJECUCIÓN DE SANCIONES EN LOTE SOBRE LA LISTA EXPLÍCITA ───────────

export async function executeRaidAction(params: {
  guild: Guild;
  episodeId: string;
  action: "apply" | "ban" | "timeout" | "undo";
  moderator: User | GuildMember;
}): Promise<{
  success: boolean;
  message: string;
  affectedCount: number;
}> {
  const { guild, episodeId, action, moderator } = params;

  // Buscar episodio en caché o MongoDB
  let episode = activeEpisodesMemory.get(episodeId);
  if (!episode) {
    try {
      const dbEp = await RaidEpisodeModel.findOne({ episodeId }).lean();
      if (dbEp) episode = dbEp as any;
    } catch {}
  }

  if (!episode) {
    return {
      success: false,
      message: "❌ No se encontró el episodio de raid solicitado o ha expirado.",
      affectedCount: 0,
    };
  }

  const me = guild.members.me;
  if (!me) {
    return {
      success: false,
      message: "❌ El bot no tiene acceso a los miembros del servidor.",
      affectedCount: 0,
    };
  }

  const modTag = "tag" in moderator ? moderator.tag : moderator.user.tag;
  const modId = moderator.id;
  const targetIds = episode.suspectIds || [];

  // ─── ACCIÓN: DESHACER (UNDO) ─────────────────────────────────────────────
  if (action === "undo") {
    let revertedCount = 0;

    for (const userId of targetIds) {
      // 1. Si estaban silenciados, quitar timeout
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.isCommunicationDisabled()) {
        await member
          .timeout(null, `Raid deshecho por ${modTag}`)
          .catch(() => null);
        revertedCount++;
      }

      // 2. Si fueron baneados, retirar ban
      if (episode.appliedAction === "ban") {
        await guild.bans.remove(userId, `Raid deshecho por ${modTag}`).catch(() => null);
        revertedCount++;
      }

      // 3. Marcar usuario como seguro temporalmente (Principio 5.3)
      markUserSafe(guild.id, userId, 2 * 60 * 60 * 1000);
    }

    if (episode.commonMetadata?.sampleText) {
      markFingerprintSafe(guild.id, episode.commonMetadata.sampleText, 2 * 60 * 60 * 1000);
    }

    episode.status = "reverted";
    episode.revertedBy = modId;
    episode.revertedAt = new Date();
    activeEpisodesMemory.set(episodeId, episode);

    void RaidEpisodeModel.updateOne(
      { episodeId },
      { status: "reverted", revertedBy: modId, revertedAt: new Date() },
    ).catch(() => null);

    return {
      success: true,
      message: `↩️ **Raid deshecho:** Se restauraron ${revertedCount} sanciones y las cuentas fueron marcadas como seguras temporalmente.`,
      affectedCount: revertedCount,
    };
  }

  // ─── ACCIÓN: BANEAR (BAN) O TIMEOUT ──────────────────────────────────────
  const resolvedAction =
    action === "apply"
      ? episode.recommendation.toLowerCase().includes("ban")
        ? "ban"
        : "timeout"
      : action;

  if (resolvedAction === "ban") {
    if (!me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return {
        success: false,
        message: "❌ Hoshiko no tiene el permiso de **Banear Miembros**.",
        affectedCount: 0,
      };
    }

    // Filtrar objetivos respetando jerarquía
    const eligibleIds: string[] = [];
    for (const id of targetIds) {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) {
        if (!canModerateTarget(me, member)) continue; // Saltar admins y roles superiores
      }
      eligibleIds.push(id);
    }

    // Baneo masivo por lotes controlados (anti-rate limit)
    const banned = await banInChunks(eligibleIds, async (id) => {
      await guild.members.ban(id, {
        deleteMessageSeconds: 3600,
        reason: `Hoshiko Anti-Raid (${episodeId}) por ${modTag}`,
      });
      await createCase({
        guildId: guild.id,
        userId: id,
        modId,
        action: "ban",
        reason: `Incursión coordinada (${episode.commonMetadata?.sharedPattern || "Raid"})`,
        source: "antiraid",
      }).catch(() => null);
    });

    episode.status = "applied";
    episode.appliedAction = "ban";
    episode.appliedBy = modId;
    episode.appliedAt = new Date();
    activeEpisodesMemory.set(episodeId, episode);

    void RaidEpisodeModel.updateOne(
      { episodeId },
      {
        status: "applied",
        appliedAction: "ban",
        appliedBy: modId,
        appliedAt: new Date(),
      },
    ).catch(() => null);

    return {
      success: true,
      message: `🔨 **Baneo de raiders completado:** ${banned}/${eligibleIds.length} cuentas sancionadas por <@${modId}>.`,
      affectedCount: banned,
    };
  }

  // resolvedAction === "timeout"
  if (!me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return {
      success: false,
      message: "❌ Hoshiko no tiene el permiso de **Moderar Miembros**.",
      affectedCount: 0,
    };
  }

  let timedOutCount = 0;
  for (const id of targetIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;

    // Jerarquía de roles
    if (!canModerateTarget(me, member)) continue;

    // Saltar a quien ya tiene timeout activo (Principio 5.4)
    if (member.communicationDisabledUntil && new Date(member.communicationDisabledUntil) > new Date()) {
      continue;
    }

    await member
      .timeout(60 * 60 * 1000, `Hoshiko Anti-Raid (${episodeId}) por ${modTag}`)
      .catch(() => null);

    await createCase({
      guildId: guild.id,
      userId: id,
      modId,
      action: "timeout",
      reason: `Incursión coordinada (${episode.commonMetadata?.sharedPattern || "Raid"})`,
      source: "antiraid",
      durationMs: 60 * 60 * 1000,
    }).catch(() => null);

    timedOutCount++;
  }

  episode.status = "applied";
  episode.appliedAction = "timeout";
  episode.appliedBy = modId;
  episode.appliedAt = new Date();
  activeEpisodesMemory.set(episodeId, episode);

  void RaidEpisodeModel.updateOne(
    { episodeId },
    {
      status: "applied",
      appliedAction: "timeout",
      appliedBy: modId,
      appliedAt: new Date(),
    },
  ).catch(() => null);

  return {
    success: true,
    message: `⏳ **Aislamiento completado:** ${timedOutCount} miembros aislados por 1 hora por <@${modId}>.`,
    affectedCount: timedOutCount,
  };
}
