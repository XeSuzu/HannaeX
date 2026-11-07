import { EmbedBuilder } from "discord.js";
import LocalLevel from "../../Database/leveling/localLevel.model";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { getCurrentWeekStart, isMilestone, totalXpForVoiceLevel } from "./xpRules";
import { assignLevelRoles } from "./levelRoleManager";

const MONGO_MAX_TIME_MS = 3000;

function withMaxTime<T>(op: any, ms = MONGO_MAX_TIME_MS): Promise<T> {
  if (op && typeof op.maxTimeMS === "function") {
    return op.maxTimeMS(ms);
  }
  return Promise.resolve(op);
}

/**
 * Derivación determinista de creditId para intervalos continuos de 5m (V01 + V03).
 * Sobrevive a caídas de red, Lost ACKs y reinicios del proceso.
 */
export function deriveContinuousCreditId(
  token: string,
  startMs: number,
): string {
  return `cont:${token}:${startMs}`;
}

/**
 * Derivación determinista de creditId para liquidaciones discontinuas / cierres (V01 + V03).
 */
export function deriveDiscontinuousCreditId(
  token: string,
  startMs: number,
  sequence: number,
): string {
  return `disc:${token}:${startMs}:${sequence}`;
}

/**
 * Curva de rendimiento decreciente por sesión continua (V05).
 */
export function getActivityMultiplier(mins: number): number {
  if (mins <= 180) return 1.0; // 0–3h  → 100%
  if (mins <= 240) return 0.75; // 3–4h  → 75%
  if (mins <= 300) return 0.5; // 4–5h  → 50%
  if (mins <= 420) return 0.25; // 5–7h  → 25%
  return 0.1; // 7h+   → 10% mínimo
}

/**
 * Protocolo Ensure-Exists con captura controlada de conflicto E11000 en { userId, guildId } (V03).
 */
export async function ensureLocalLevelExists(
  userId: string,
  guildId: string,
  currentWeekStart: Date = getCurrentWeekStart(),
): Promise<void> {
  try {
    await withMaxTime(
      LocalLevel.updateOne(
        { userId, guildId },
        {
          $setOnInsert: {
            userId,
            guildId,
            xp: 0,
            level: 0,
            messagesSent: 0,
            voiceXp: 0,
            voiceLevel: 0,
            voiceMinutes: 0,
            weeklyXp: 0,
            weeklyMessages: 0,
            weeklyVoiceMinutes: 0,
            weekStartDate: currentWeekStart,
            appliedCreditIds: [],
          },
        },
        { upsert: true },
      ),
    );
  } catch (error: any) {
    const isExpectedUniqueConflict =
      error?.code === 11000 &&
      ((error?.keyPattern?.userId === 1 && error?.keyPattern?.guildId === 1) ||
        (typeof error?.message === "string" &&
          error.message.includes("userId_1_guildId_1")));

    if (isExpectedUniqueConflict) {
      return;
    }

    throw error;
  }
}

export interface VoiceXpResult {
  applied: boolean;
  leveledUp: boolean;
  earnedXp: number;
  newVoiceLevel: number;
}

export async function handleVoiceXp(
  member: any,
  config: {
    xpVoiceEnabled: boolean;
    ignoredChannels: string[];
    ignoredRoles: string[];
    xpVoiceMinMinutes: number;
    xpPerMinuteVoice: number;
    xpMultiplier: number;
    levelRoles?: any[];
  },
  minutesInVoice: number,
  channelId: string | null,
  totalSessionMinutes: number = 0,
  creditId?: string,
): Promise<VoiceXpResult> {
  const noOp: VoiceXpResult = {
    applied: false,
    leveledUp: false,
    earnedXp: 0,
    newVoiceLevel: 0,
  };

  if (!config?.xpVoiceEnabled) return noOp;

  if (channelId && config.ignoredChannels?.includes(channelId)) return noOp;
  if (
    config.ignoredRoles?.some((r: string) => member?.roles?.cache?.has?.(r))
  ) {
    return noOp;
  }

  const minMinutes = config.xpVoiceMinMinutes ?? 1;
  const safeMinutes = Math.max(0, Math.floor(minutesInVoice || 0));
  if (safeMinutes < minMinutes) return noOp;

  const xpGain = config.xpPerMinuteVoice ?? 10;
  const multiplier = config.xpMultiplier ?? 1.0;

  const actMultiplier = getActivityMultiplier(totalSessionMinutes);
  const earned = Math.floor(xpGain * safeMinutes * multiplier * actMultiplier);

  if (earned <= 0) return noOp;

  const userId = member.id;
  const guildId = member.guild.id;
  const now = new Date();
  const currentWeekStart = getCurrentWeekStart();

  // Fase 1: Garantizar existencia del documento sin riesgo de E11000 en el paso de deduplicación
  await ensureLocalLevelExists(userId, guildId, currentWeekStart);

  // Fase 2: Actualización atómica condicional con upsert: false y pipeline semanal simétrico (V02 + V03)
  const isNewWeekExpr = {
    $lt: [{ $ifNull: ["$weekStartDate", new Date(0)] }, currentWeekStart],
  };

  const filter: Record<string, any> = { userId, guildId };
  if (creditId) {
    filter["appliedCreditIds.id"] = { $ne: creditId };
  }

  const pipelineUpdate: any[] = [
    {
      $set: {
        voiceXp: { $add: [{ $ifNull: ["$voiceXp", 0] }, earned] },
        voiceMinutes: {
          $add: [{ $ifNull: ["$voiceMinutes", 0] }, safeMinutes],
        },
        ...(creditId
          ? {
              appliedCreditIds: {
                $slice: [
                  {
                    $concatArrays: [
                      { $ifNull: ["$appliedCreditIds", []] },
                      [{ id: creditId, at: now }],
                    ],
                  },
                  -100,
                ],
              },
            }
          : {}),
        weeklyVoiceMinutes: {
          $cond: {
            if: isNewWeekExpr,
            then: safeMinutes,
            else: {
              $add: [{ $ifNull: ["$weeklyVoiceMinutes", 0] }, safeMinutes],
            },
          },
        },
        weeklyXp: {
          $cond: {
            if: isNewWeekExpr,
            then: 0,
            else: { $ifNull: ["$weeklyXp", 0] },
          },
        },
        weeklyMessages: {
          $cond: {
            if: isNewWeekExpr,
            then: 0,
            else: { $ifNull: ["$weeklyMessages", 0] },
          },
        },
        weekStartDate: {
          $cond: {
            if: isNewWeekExpr,
            then: currentWeekStart,
            else: { $ifNull: ["$weekStartDate", currentWeekStart] },
          },
        },
      },
    },
  ];

  const updateRes: any = await withMaxTime(
    LocalLevel.updateOne(filter, pipelineUpdate as any, { upsert: false }),
  );

  // Si modifiedCount === 0 (y matchedCount === 0 por el filtro appliedCreditIds), el crédito ya fue procesado
  if (
    updateRes &&
    typeof updateRes.modifiedCount === "number" &&
    updateRes.modifiedCount === 0
  ) {
    return noOp;
  }

  let updatedDoc: any = null;
  if (typeof LocalLevel.findOne === "function") {
    try {
      updatedDoc = await withMaxTime(LocalLevel.findOne({ userId, guildId }));
    } catch {
      updatedDoc = null;
    }
  }

  const oldVoiceLevel = updatedDoc?.voiceLevel ?? 0;
  const newVoiceXp = updatedDoc?.voiceXp ?? earned;
  let newVoiceLevel = oldVoiceLevel;

  while (newVoiceXp >= totalXpForVoiceLevel(newVoiceLevel + 1)) {
    newVoiceLevel++;
  }

  const leveledUp = newVoiceLevel > oldVoiceLevel;

  if (leveledUp) {
    await withMaxTime(
      LocalLevel.updateOne(
        {
          userId,
          guildId,
          voiceLevel: { $lt: newVoiceLevel },
        },
        { $set: { voiceLevel: newVoiceLevel } },
      ),
    );

    const displayName =
      member.displayName || member.user?.displayName || member.user?.username || userId;
    console.log(
      `[VoiceLevel] ${displayName} subió al Nivel VC ${newVoiceLevel} en ${member.guild.name}`,
    );

    if (config?.levelRoles?.length && member && member.guild) {
      await assignLevelRoles(
        member,
        config.levelRoles,
        oldVoiceLevel,
        newVoiceLevel,
        member.guild,
      );
    }

    if (
      member.guild?.channels?.cache &&
      typeof HoshikoLogger?.sendToChannel === "function"
    ) {
      const milestone = isMilestone(newVoiceLevel);
      const embed = new EmbedBuilder()
        .setColor(milestone ? 0xffd700 : 0x5865f2)
        .setTitle(
          milestone
            ? `🎙️ ⭐ Nivel de Voz ${newVoiceLevel} (Hito Alcanzado)`
            : `🎙️ Nivel de Voz ${newVoiceLevel}`,
        )
        .addFields(
          {
            name: "Usuario",
            value: `<@${userId}>`,
            inline: true,
          },
          {
            name: "Progreso VC",
            value: `Nivel \`${oldVoiceLevel}\` → \`${newVoiceLevel}\``,
            inline: true,
          },
          {
            name: "XP de Voz Total",
            value: `\`${newVoiceXp.toLocaleString()}\` XP`,
            inline: true,
          },
        )
        .setFooter({ text: "Hoshiko Logs • Voice XP" })
        .setTimestamp();

      if (typeof member.user?.displayAvatarURL === "function") {
        embed.setThumbnail(member.user.displayAvatarURL());
      }

      void HoshikoLogger.sendToChannel(member.guild, "levellog", embed);
    }
  }

  return {
    applied: true,
    leveledUp,
    earnedXp: earned,
    newVoiceLevel,
  };
}
