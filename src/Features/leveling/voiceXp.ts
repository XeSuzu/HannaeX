import LocalLevel from "../../Models/LocalLevels";
import { getCurrentWeekStart, totalXpForVoiceLevel } from "./xpRules";

export async function handleVoiceXp(
  member: any,
  config: {
    xpVoiceEnabled: boolean;
    ignoredChannels: string[];
    ignoredRoles: string[];
    xpVoiceMinMinutes: number;
    xpPerMinuteVoice: number;
    xpMultiplier: number;
  },
  minutesInVoice: number,
  channelId: string | null,
  totalSessionMinutes: number = 0,
): Promise<void> {
  if (!config.xpVoiceEnabled) return;

  if (channelId && config.ignoredChannels.includes(channelId)) return;
  if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r)))
    return;

  const minMinutes = config.xpVoiceMinMinutes ?? 1;
  const safeMinutes = Math.max(0, Math.floor(minutesInVoice || 0));
  if (safeMinutes < minMinutes) return;

  const xpGain = config.xpPerMinuteVoice ?? 10;
  const multiplier = config.xpMultiplier ?? 1.0;

  // ─── Curva de rendimiento decreciente por sesión ──────────────────────────
  function getActivityMultiplier(mins: number): number {
    if (mins <= 180) return 1.0; // 0–3h  → 100%
    if (mins <= 240) return 0.75; // 3–4h  → 75%
    if (mins <= 300) return 0.5; // 4–5h  → 50%
    if (mins <= 420) return 0.25; // 5–7h  → 25%
    return 0.1; // 7h+   → 10% mínimo
  }

  const actMultiplier = getActivityMultiplier(totalSessionMinutes);
  let earned = Math.floor(xpGain * safeMinutes * multiplier * actMultiplier);

  if (earned <= 0) return;

  let profile = await LocalLevel.findOne({
    userId: member.id,
    guildId: member.guild.id,
  });

  if (!profile) {
    profile = await LocalLevel.create({
      userId: member.id,
      guildId: member.guild.id,
    });
  }

  const newVoiceXp = (profile.voiceXp ?? 0) + earned;
  let newVoiceLevel = profile.voiceLevel ?? 0;

  while (newVoiceXp >= totalXpForVoiceLevel(newVoiceLevel + 1)) {
    newVoiceLevel++;
  }

  const leveledUp = newVoiceLevel > (profile.voiceLevel ?? 0);

  const currentWeekStart = getCurrentWeekStart();
  const localWeekStart = profile.weekStartDate ?? new Date(0);
  const weeklyVoiceMinutes =
    localWeekStart < currentWeekStart
      ? safeMinutes
      : (profile.weeklyVoiceMinutes ?? 0) + safeMinutes;

  await LocalLevel.updateOne(
    { userId: member.id, guildId: member.guild.id },
    {
      $set: {
        voiceXp: newVoiceXp,
        voiceLevel: newVoiceLevel,
      },
      $inc: {
        voiceMinutes: safeMinutes,
      },
      weeklyVoiceMinutes,
      ...(localWeekStart < currentWeekStart && {
        weekStartDate: currentWeekStart,
      }),
    },
  );

  if (leveledUp) {
    console.log(
      `[VoiceLevel] ${member.user.username} subió al Nivel VC ${newVoiceLevel} en ${member.guild.name}`,
    );
  }
}
