import { EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import LevelConfig from "../../Models/LevelConfig";
import LocalLevel from "../../Models/LocalLevels";
import { handleGlobalXp } from "./globalTextXp";
import { getCurrentWeekStart, isMilestone, totalXpForLevel } from "./xpRules";

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
