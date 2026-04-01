import { EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import GlobalLevel, {
  getAchievement,
  getTierForLevel,
  GLOBAL_TIERS,
  globalTotalXpForLevel,
} from "../Models/GlobalLevel";
import LevelConfig from "../Models/LevelConfig";
import LocalLevel from "../Models/LocalLevels";

// XP necesaria para subir del nivel N al N+1
export function xpForLevel(level: number): number {
  return 100 + level * 50;
}

// XP total acumulada hasta el nivel N
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

// Verificar si es un nivel "importante" (milestone)
export function isMilestone(level: number): boolean {
  const milestones = [5, 10, 15, 20, 25, 30, 50, 75, 100];
  return milestones.includes(level);
}

// ============================================
// MANEJO DE XP GLOBAL
// ============================================
async function handleGlobalXp(
  message: Message,
  localXpEarned: number,
): Promise<void> {
  const userId = message.author.id;
  const now = new Date();

  let globalProfile = await GlobalLevel.findOne({ userId });

  if (!globalProfile) {
    globalProfile = await GlobalLevel.create({
      userId,
      globalXp: 0,
      globalLevel: 0,
      totalMessages: 0,
      totalVoiceMinutes: 0,
      serversJoined: 1,
      achievements: [],
      currentTier: "mihon",
      globalStreak: 0,
      lastGlobalXpGain: now,
      weeklyXp: 0,
      weeklyMessages: 0,
    });
  }

  // Calcular XP global (reducida compared a local)
  const globalXpEarned = Math.max(1, Math.floor(localXpEarned * 0.3));

  // Actualizar estadísticas
  const newGlobalXp = globalProfile.globalXp + globalXpEarned;
  let newGlobalLevel = globalProfile.globalLevel;

  // Calcular nuevo nivel global
  while (newGlobalXp >= globalTotalXpForLevel(newGlobalLevel + 1)) {
    newGlobalLevel++;
  }

  const leveledUpGlobal = newGlobalLevel > globalProfile.globalLevel;
  const oldGlobalLevel = globalProfile.globalLevel;

  // Verificar nuevo tier
  const oldTier = getTierForLevel(oldGlobalLevel);
  const newTier = getTierForLevel(newGlobalLevel);
  const tierUp = newTier.tier !== oldTier.tier;

  // Reset weekly if needed
  const currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay(),
  );

  let weeklyXp = globalProfile.weeklyXp + globalXpEarned;
  let weeklyMessages = globalProfile.weeklyMessages + 1;

  if (globalProfile.weekStartDate < currentWeekStart) {
    weeklyXp = globalXpEarned;
    weeklyMessages = 1;
  }

  // Verificar logros KAWAI
  const achievements = [...globalProfile.achievements];
  const newAchievements = checkAchievements(
    globalProfile,
    message,
    newGlobalLevel,
  );

  // Añadir nuevos logros únicos
  for (const ach of newAchievements) {
    if (!achievements.includes(ach)) {
      achievements.push(ach);
    }
  }

  // Actualizar perfil global
  await GlobalLevel.updateOne(
    { userId },
    {
      globalXp: newGlobalXp,
      globalLevel: newGlobalLevel,
      $inc: {
        totalMessages: 1,
      },
      currentTier: newTier.tier,
      lastGlobalXpGain: now,
      weeklyXp,
      weeklyMessages,
      weekStartDate: currentWeekStart,
      ...(newAchievements.length > 0 && { achievements }),
    },
  );

  // Actualizar serversJoined si es la primera vez en este servidor
  const localProfile = await LocalLevel.findOne({
    userId,
    guildId: message.guild?.id,
  });
  if (!localProfile) {
    await GlobalLevel.updateOne({ userId }, { $inc: { serversJoined: 1 } });
  }

  // Anunciar nuevo logro (DM)
  if (newAchievements.length > 0) {
    await announceAchievements(message.author, newAchievements);
  }

  // Anunciar subida de nivel global si corresponde
  if (leveledUpGlobal) {
    await announceGlobalLevelUp(
      message.author,
      oldGlobalLevel,
      newGlobalLevel,
      newTier,
    );
  }

  // Anunciar nuevo tier
  if (tierUp) {
    await announceGlobalTierUp(message.author, newTier);
  }
}

function checkAchievements(
  profile: any,
  message: Message,
  newLevel: number,
): string[] {
  const newAchievements: string[] = [];

  // Logros por nivel
  if (newLevel >= 1 && !profile.achievements.includes("first_level")) {
    newAchievements.push("first_level");
  }
  if (newLevel >= 10 && !profile.achievements.includes("level_10")) {
    newAchievements.push("level_10");
  }
  if (newLevel >= 50 && !profile.achievements.includes("level_50")) {
    newAchievements.push("level_50");
  }
  if (newLevel >= 100 && !profile.achievements.includes("level_100")) {
    newAchievements.push("level_100");
  }

  // Logros por mensajes
  if (
    profile.totalMessages + 1 >= 1000 &&
    !profile.achievements.includes("messages_1k")
  ) {
    newAchievements.push("messages_1k");
  }
  if (
    profile.totalMessages + 1 >= 10000 &&
    !profile.achievements.includes("messages_10k")
  ) {
    newAchievements.push("messages_10k");
  }

  // Logros por servidores
  if (message.guild && !profile.achievements.includes("multi_server")) {
    newAchievements.push("multi_server");
  }

  return newAchievements;
}

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

// ============================================
// MANEJO DE XP LOCAL (POR SERVIDOR)
// ============================================
export async function handleLevelXp(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const config = await LevelConfig.findOne({ guildId: message.guild.id });

  // Si el sistema NO está activado, salir
  if (!config?.enabled) return;

  // Ignorar bots si está configurado
  if (config?.ignoreBots && message.author.bot) return;

  // Canal ignorado
  if (config?.ignoredChannels.includes(message.channelId)) return;

  // Rol ignorado
  const memberRoles = message.member?.roles.cache.map((r) => r.id) ?? [];
  if (config?.ignoredRoles.some((r: string) => memberRoles.includes(r))) return;

  // Validar longitud mínima del mensaje
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

  // Cooldown
  const secondsSinceLast =
    (now.getTime() - profile.lastXpGain.getTime()) / 1000;
  if (secondsSinceLast < cooldownSecs) {
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { messagesSent: 1 } },
    );
    return;
  }

  // XP base + bonus por menciones
  let earned = Math.floor(baseXp + Math.random() * baseXp * 0.5);

  // Bonus por menciones
  if (config?.xpMentionBonus && config.xpMentionBonus > 0) {
    const mentions = message.mentions.users.size;
    if (mentions > 0) {
      const mentionBonus = Math.min(
        mentions * config.xpMentionBonus,
        config.xpMentionMaxBonus ?? 25,
      );
      earned += Math.floor(mentionBonus);
    }
  }

  // Aplicar multiplicador
  earned = Math.floor(earned * multiplier);

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
      $inc: { messagesSent: 1 },
    },
  );

  // ── XP GLOBAL (siempre se gana) ──
  await handleGlobalXp(message, earned);

  if (!leveledUp) return;

  // ── Asignar roles de nivel ──
  if (config?.levelRoles.length && message.member) {
    await assignLevelRoles(
      message.member,
      config.levelRoles,
      oldLevel,
      newLevel,
      message.guild,
    );
  }

  // ── Anuncio de subida de nivel ──
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

// Asignar roles gained al subir de nivel
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

// Manejar XP por voz
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
): Promise<void> {
  if (!config.xpVoiceEnabled) return;
  if (config.ignoredChannels.includes(member.channelId)) return;
  if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r)))
    return;

  const minMinutes = config.xpVoiceMinMinutes ?? 1;
  if (minutesInVoice < minMinutes) return;

  const xpGain = config.xpPerMinuteVoice ?? 10;
  const multiplier = config.xpMultiplier ?? 1.0;
  const earned = Math.floor(xpGain * minutesInVoice * multiplier);

  const profile = await LocalLevel.findOne({
    userId: member.id,
    guildId: member.guild.id,
  });

  if (!profile) return;

  const newXp = profile.xp + earned;
  let newLevel = profile.level;

  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  await LocalLevel.updateOne(
    { userId: member.id, guildId: member.guild.id },
    { $set: { xp: newXp, level: newLevel } },
  );
}
