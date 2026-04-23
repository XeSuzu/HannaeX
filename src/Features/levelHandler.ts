import { EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import GlobalLevel, {
  getAchievement,
  getTierForLevel,
  GLOBAL_TIERS,
  globalTotalXpForLevel,
} from "../Models/GlobalLevel";
import LevelConfig from "../Models/LevelConfig";
import LocalLevel from "../Models/LocalLevels";

// ─── Fórmulas de XP ──────────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return 100 + level * 50;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

export function xpForVoiceLevel(level: number): number {
  return Math.floor(80 + level * 40);
}

export function totalXpForVoiceLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForVoiceLevel(i);
  return total;
}

export function isMilestone(level: number): boolean {
  const milestones = [5, 10, 15, 20, 25, 30, 50, 75, 100];
  return milestones.includes(level);
}

// ─── Helper de semana (lunes como inicio) ────────────────────────────────────
function getCurrentWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

// ─── XP GLOBAL (solo texto cross-server) ─────────────────────────────────────
async function handleGlobalXp(
  message: Message,
  localXpEarned: number,
  isAbuse: boolean = false,
): Promise<void> {
  const userId = message.author.id;
  const now = new Date();

  let globalProfile = await GlobalLevel.findOne({ userId });
  const isNewGlobalProfile = !globalProfile;

  if (!globalProfile) {
    globalProfile = await GlobalLevel.create({
      userId,
      globalXp: 0,
      globalLevel: 0,
      totalMessages: 0,
      serversJoined: 1,
      achievements: [],
      currentTier: "mihon",
      globalStreak: 0,
      lastGlobalXpGain: now,
      weeklyXp: 0,
      weeklyMessages: 0,
      weekStartDate: new Date(0),
    });
  }

  if (!isNewGlobalProfile) {
    const localProfile = await LocalLevel.findOne({
      userId,
      guildId: message.guild?.id,
    });
    if (!localProfile) {
      await GlobalLevel.updateOne({ userId }, { $inc: { serversJoined: 1 } });
      globalProfile.serversJoined += 1;
    }
  }

  let globalXpEarned = Math.max(1, Math.floor(localXpEarned * 0.3));

  if (isAbuse) {
    const cooldownUntil = new Date(now.getTime() + 5 * 60 * 1000);
    await GlobalLevel.updateOne(
      { userId },
      { abuseCooldownUntil: cooldownUntil },
    );
    globalXpEarned = 0;
  }

  const newGlobalXp = globalProfile.globalXp + globalXpEarned;
  let newGlobalLevel = globalProfile.globalLevel;

  while (newGlobalXp >= globalTotalXpForLevel(newGlobalLevel + 1)) {
    newGlobalLevel++;
  }

  const leveledUpGlobal = newGlobalLevel > globalProfile.globalLevel;
  const oldGlobalLevel = globalProfile.globalLevel;

  const oldTier = getTierForLevel(oldGlobalLevel);
  const newTier = getTierForLevel(newGlobalLevel);
  const tierUp = newTier.tier !== oldTier.tier;

  const currentWeekStart = getCurrentWeekStart();
  const previousWeekStart = globalProfile.weekStartDate ?? new Date(0);

  let weeklyXp: number;
  let weeklyMessages: number;

  if (previousWeekStart < currentWeekStart) {
    weeklyXp = globalXpEarned;
    weeklyMessages = 1;
  } else {
    weeklyXp = (globalProfile.weeklyXp ?? 0) + globalXpEarned;
    weeklyMessages = (globalProfile.weeklyMessages ?? 0) + 1;
  }

  const lastGain = globalProfile.lastGlobalXpGain ?? new Date(0);
  const hoursSinceLast =
    (now.getTime() - lastGain.getTime()) / (1000 * 60 * 60);

  let newStreak = globalProfile.globalStreak ?? 0;
  if (hoursSinceLast >= 20 && hoursSinceLast <= 48) {
    newStreak += 1;
  } else if (hoursSinceLast > 48) {
    newStreak = 1;
  }

  const achievements = [...globalProfile.achievements];
  const newAchievements = checkAchievements(
    {
      ...globalProfile.toObject(),
      serversJoined: globalProfile.serversJoined,
      globalStreak: newStreak,
    },
    message,
    newGlobalLevel,
  );

  for (const ach of newAchievements) {
    if (!achievements.includes(ach)) {
      achievements.push(ach);
    }
  }

  await GlobalLevel.updateOne(
    { userId },
    {
      globalXp: newGlobalXp,
      globalLevel: newGlobalLevel,
      $inc: { totalMessages: 1 },
      currentTier: newTier.tier,
      lastGlobalXpGain: now,
      globalStreak: newStreak,
      weeklyXp,
      weeklyMessages,
      weekStartDate: currentWeekStart,
      ...(newAchievements.length > 0 && { achievements }),
    },
  );

  if (newAchievements.length > 0) {
    await announceAchievements(message.author, newAchievements);
  }

  if (leveledUpGlobal) {
    await announceGlobalLevelUp(
      message.author,
      oldGlobalLevel,
      newGlobalLevel,
      newTier,
    );
  }

  if (tierUp) {
    await announceGlobalTierUp(message.author, newTier);
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────────
function checkAchievements(
  profile: any,
  message: Message,
  newLevel: number,
): string[] {
  const newAchievements: string[] = [];

  if (newLevel >= 1 && !profile.achievements.includes("first_level"))
    newAchievements.push("first_level");
  if (newLevel >= 10 && !profile.achievements.includes("level_10"))
    newAchievements.push("level_10");
  if (newLevel >= 50 && !profile.achievements.includes("level_50"))
    newAchievements.push("level_50");
  if (newLevel >= 100 && !profile.achievements.includes("level_100"))
    newAchievements.push("level_100");

  if (
    profile.totalMessages + 1 >= 1000 &&
    !profile.achievements.includes("messages_1k")
  )
    newAchievements.push("messages_1k");

  if (
    profile.totalMessages + 1 >= 10000 &&
    !profile.achievements.includes("messages_10k")
  )
    newAchievements.push("messages_10k");

  if (
    profile.serversJoined >= 2 &&
    !profile.achievements.includes("multi_server")
  )
    newAchievements.push("multi_server");

  if (
    (profile.globalStreak ?? 0) >= 7 &&
    !profile.achievements.includes("streak_7")
  )
    newAchievements.push("streak_7");

  if (
    (profile.globalStreak ?? 0) >= 30 &&
    !profile.achievements.includes("streak_30")
  )
    newAchievements.push("streak_30");

  return newAchievements;
}

// ─── Anuncios ─────────────────────────────────────────────────────────────────
async function announceAchievements(
  user: any,
  achievementIds: string[],
): Promise<void> {
  const channel = user.dmChannel ?? (await user.createDM().catch(() => null));
  if (!channel) return;

  for (const achId of achievementIds) {
    const achievement = getAchievement(achId);
    if (!achievement) continue;

    const embed = new EmbedBuilder()
      .setColor(achievement.color)
      .setTitle(
        `${achievement.emoji} ¡Logro Desbloqueado! ${achievement.emoji}`,
      )
      .setDescription(
        `**${user.displayName}** ha conseguido:\n\n` +
          `🌸 **${achievement.name}** (${achievement.nameEn})\n` +
          `📝 ${achievement.description}`,
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: "Hoshiko Global Levels ✨" })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  }
}

async function announceGlobalLevelUp(
  user: any,
  oldLevel: number,
  newLevel: number,
  tier: (typeof GLOBAL_TIERS)[0],
): Promise<void> {
  const channel = user.dmChannel ?? (await user.createDM().catch(() => null));
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(tier.color)
    .setTitle(`${tier.emoji} ¡Nivel Global: ${newLevel}! ${tier.emoji}`)
    .setDescription(
      `**${user.displayName}** ha alcanzado el **nivel ${newLevel}**!\n\n` +
        `🏆 Tier actual: **${tier.name}** (${tier.nameJp}) ${tier.emoji}\n` +
        `📝 "${tier.description}"`,
    )
    .setThumbnail(user.displayAvatarURL())
    .addFields({
      name: "🌸 ¡Sigue así!",
      value: `Nivel \`${oldLevel}\` → \`${newLevel}\``,
      inline: false,
    })
    .setFooter({ text: "Hoshiko Global Levels ✨" })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

async function announceGlobalTierUp(
  user: any,
  tier: (typeof GLOBAL_TIERS)[0],
): Promise<void> {
  const channel = user.dmChannel ?? (await user.createDM().catch(() => null));
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(tier.color)
    .setTitle(`${tier.emoji} ¡Nuevo Tier Desbloqueado! ${tier.emoji}`)
    .setDescription(
      `**${user.displayName}** ha alcanzado un nuevo tier:\n\n` +
        `✨ **${tier.name}** ✨\n` +
        `${tier.nameJp}\n\n` +
        `📝 "${tier.description}"`,
    )
    .setThumbnail(user.displayAvatarURL())
    .setFooter({ text: "Hoshiko Global Levels ✨" })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

// ─── XP LOCAL (texto por servidor) ───────────────────────────────────────────
export async function handleLevelXp(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const config = await LevelConfig.findOne({ guildId: message.guild.id });
  if (!config?.enabled) return;
  if (config?.ignoreBots && message.author.bot) return;
  if (config?.ignoredChannels.includes(message.channelId)) return;

  const memberRoles = message.member?.roles.cache.map((r) => r.id) ?? [];
  if (config?.ignoredRoles.some((r: string) => memberRoles.includes(r))) return;

  const minLength = config?.xpMinLength ?? 5;
  if (message.content.length < minLength) return;

  const baseXp = config?.xpPerMessage ?? 20;
  const cooldownSecs = config?.xpCooldown ?? 60;
  const multiplier = config?.xpMultiplier ?? 1.0;
  const now = new Date();

  let profile = await LocalLevel.findOne({
    userId: message.author.id,
    guildId: message.guild.id,
  });

  if (!profile) {
    profile = await LocalLevel.create({
      userId: message.author.id,
      guildId: message.guild.id,
      xp: 0,
      level: 0,
      messagesSent: 0,
      lastXpGain: new Date(0),
    });
  }

  const secondsSinceLast =
    (now.getTime() - profile.lastXpGain.getTime()) / 1000;

  const totalMentions = message.mentions.users.size;
  const validMentions = message.mentions.users.filter(
    (u) => !u.bot && u.id !== message.author.id,
  ).size;

  const isInvalidMentionSpam = totalMentions > validMentions;
  const isVeryFastSpam = secondsSinceLast < 5;
  const isAbuse = isInvalidMentionSpam || isVeryFastSpam;

  const isInAbuseCooldown =
    !!profile.abuseCooldownUntil && now < profile.abuseCooldownUntil;

  if (isInAbuseCooldown) {
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { messagesSent: 1 } },
    );
    return;
  }

  if (isAbuse) {
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      {
        abuseCooldownUntil: new Date(now.getTime() + 5 * 60 * 1000),
        $inc: { messagesSent: 1 },
      },
    );
    return;
  }

  const passiveWindow = Math.max(15, Math.floor(cooldownSecs * 0.25));
  const isPassiveRange =
    secondsSinceLast >= passiveWindow && secondsSinceLast < cooldownSecs;

  let earned = Math.floor(baseXp + Math.random() * baseXp * 0.5);

  if (
    config?.xpMentionBonus &&
    config.xpMentionBonus > 0 &&
    validMentions > 0
  ) {
    const mentionBonus = Math.min(
      validMentions * config.xpMentionBonus,
      config.xpMentionMaxBonus ?? 25,
    );
    earned += Math.floor(mentionBonus);
  }

  if (isPassiveRange) {
    earned = Math.max(1, Math.floor(earned * 0.35));
  }

  earned = Math.floor(earned * multiplier);

  if (earned <= 0) {
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { messagesSent: 1 } },
    );
    await handleGlobalXp(message, 0, false);
    return;
  }

  const currentWeekStart = getCurrentWeekStart();
  const localWeekStart = profile.weekStartDate ?? new Date(0);

  let weeklyXp: number;
  let weeklyMessages: number;

  if (localWeekStart < currentWeekStart) {
    weeklyXp = earned;
    weeklyMessages = 1;
  } else {
    weeklyXp = (profile.weeklyXp ?? 0) + earned;
    weeklyMessages = (profile.weeklyMessages ?? 0) + 1;
  }

  const newXp = profile.xp + earned;
  let newLevel = profile.level;

  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  const leveledUp = newLevel > profile.level;
  const oldLevel = profile.level;

  await LocalLevel.updateOne(
    { userId: message.author.id, guildId: message.guild.id },
    {
      xp: newXp,
      level: newLevel,
      lastXpGain: now,
      weeklyXp,
      weeklyMessages,
      weekStartDate: currentWeekStart,
      $inc: { messagesSent: 1 },
    },
  );

  await handleGlobalXp(message, earned, false);

  if (!leveledUp) return;

  if (config?.levelRoles.length && message.member) {
    await assignLevelRoles(
      message.member,
      config.levelRoles,
      oldLevel,
      newLevel,
      message.guild,
    );
  }

  const announceMode = config?.announceMode ?? "milestone";
  if (announceMode === "silent") return;
  if (announceMode === "milestone" && !isMilestone(newLevel)) return;

  const milestone = isMilestone(newLevel);
  const milestoneEmoji = milestone ? "⭐ " : "";
  const celebrationEmoji = milestone ? "🎉" : "✨";

  const embed = new EmbedBuilder()
    .setColor(milestone ? 0xffd700 : 0xffb7c5)
    .setAuthor({
      name: `${celebrationEmoji} ¡${message.author.displayName} subió de nivel! ${milestoneEmoji}`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTitle(
      `${milestone ? "⭐ " : "🌸"} Nivel ${newLevel} ${milestone ? "⭐" : ""}`,
    )
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      {
        name: "📊 Progreso",
        value: `Nivel \`${oldLevel}\` → \`${newLevel}\``,
        inline: true,
      },
      {
        name: "⚡ XP Total",
        value: `\`${newXp.toLocaleString()}\` XP`,
        inline: true,
      },
      {
        name: milestone ? "🏆 ¡Felicidades!" : "💪 ¡Sigue así!",
        value: milestone
          ? `¡Llegaste a un nivel importante! 🎊`
          : `XP ganada: **+${earned}**`,
        inline: false,
      },
    )
    .setFooter({
      text: milestone
        ? `🎉 ¡${newLevel} es un nivel especial! • Hoshiko Levels 🌸`
        : "Hoshiko Levels 🌸",
    })
    .setTimestamp();

  if (config?.announceDM) {
    await message.author.send({ embeds: [embed] }).catch(() => null);
    return;
  }

  const announceChannelId = config?.announceChannelId ?? message.channelId;
  const channel = message.guild.channels.cache.get(announceChannelId) as
    | TextChannel
    | undefined;
  await channel?.send({ embeds: [embed] }).catch(() => null);
}

// ─── Roles de nivel ───────────────────────────────────────────────────────────
async function assignLevelRoles(
  member: GuildMember,
  levelRoles: Array<{ level: number; roleId: string; message?: string | null }>,
  oldLevel: number,
  newLevel: number,
  guild: any,
): Promise<void> {
  const rolesGained = levelRoles.filter(
    (lr) => lr.level > oldLevel && lr.level <= newLevel,
  );

  for (const roleConfig of rolesGained) {
    try {
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (role && !member.roles.cache.has(roleConfig.roleId)) {
        await member.roles.add(roleConfig.roleId);

        if (roleConfig.message) {
          const channel =
            member.guild.systemChannel ??
            guild.channels.cache.find((c: any) => c.isTextBased());
          if (channel) {
            const roleMessage = roleConfig.message
              .replace("{user}", member.displayName)
              .replace("{role}", role.name)
              .replace("{level}", roleConfig.level.toString());
            await channel.send(roleMessage).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error(
        `[LevelRoles] Error asignando rol ${roleConfig.roleId}:`,
        err,
      );
    }
  }
}

// ─── XP de voz (solo local) ───────────────────────────────────────────────────
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
