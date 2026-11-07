import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { LevelConfigCache } from "../../Database/leveling/LevelConfigCache";
import LocalLevel from "../../Database/leveling/localLevel.model";
import { queueLocalMessageIncrement } from "../../Database/system/BulkWriteBuffer";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { getCurrentWeekStart, isMilestone, totalXpForLevel } from "./xpRules";
import { assignLevelRoles } from "./levelRoleManager";

export async function handleLevelXp(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const config = await LevelConfigCache.getLite(message.guild.id);
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

  const profile = await LocalLevel.findOneAndUpdate(
    {
      userId: message.author.id,
      guildId: message.guild.id,
    },
    {
      $setOnInsert: {
        userId: message.author.id,
        guildId: message.guild.id,
        xp: 0,
        level: 0,
        messagesSent: 0,
        lastXpGain: new Date(0),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

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
    queueLocalMessageIncrement(message.guild.id, message.author.id, 1);
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
  if (secondsSinceLast < passiveWindow) {
    queueLocalMessageIncrement(message.guild.id, message.author.id, 1);
    return;
  }

  const isPassiveRange = secondsSinceLast < cooldownSecs;

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
    queueLocalMessageIncrement(message.guild.id, message.author.id, 1);
    return;
  }

  const currentWeekStart = getCurrentWeekStart();
  const isNewWeekExpr = {
    $lt: [{ $ifNull: ["$weekStartDate", new Date(0)] }, currentWeekStart],
  };

  const updated = await LocalLevel.findOneAndUpdate(
    { userId: message.author.id, guildId: message.guild.id },
    [
      {
        $set: {
          xp: { $add: [{ $ifNull: ["$xp", 0] }, earned] },
          messagesSent: { $add: [{ $ifNull: ["$messagesSent", 0] }, 1] },
          lastXpGain: now,
          weeklyXp: {
            $cond: {
              if: isNewWeekExpr,
              then: earned,
              else: { $add: [{ $ifNull: ["$weeklyXp", 0] }, earned] },
            },
          },
          weeklyMessages: {
            $cond: {
              if: isNewWeekExpr,
              then: 1,
              else: { $add: [{ $ifNull: ["$weeklyMessages", 0] }, 1] },
            },
          },
          weeklyVoiceMinutes: {
            $cond: {
              if: isNewWeekExpr,
              then: 0,
              else: { $ifNull: ["$weeklyVoiceMinutes", 0] },
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
    ] as any,
    { new: true },
  );

  const newXp = updated?.xp ?? profile.xp + earned;
  const oldLevel = profile.level;
  let newLevel = oldLevel;

  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  const leveledUp = newLevel > oldLevel;
  if (leveledUp) {
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id, level: { $lt: newLevel } },
      { $set: { level: newLevel } },
    );
  }

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

  const milestone = isMilestone(newLevel);

  const embed = new EmbedBuilder()
    .setColor(milestone ? 0xffd700 : 0xffb7c5)
    .setAuthor({
      name: milestone
        ? `⭐ ¡${message.author.displayName} subió de nivel!`
        : `✨ ¡${message.author.displayName} subió de nivel!`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTitle(
      milestone ? `⭐ Nivel ${newLevel} (Hito Alcanzado)` : `🌸 Nivel ${newLevel}`,
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
          ? `¡Has alcanzado un nivel especial!`
          : `XP ganada: **+${earned}**`,
        inline: false,
      },
    )
    .setFooter({
      text: milestone
        ? `⭐ ¡Nivel especial alcanzado! • Hoshiko 🌸`
        : `Hoshiko 🌸 • ${message.guild.name}`,
    })
    .setTimestamp();

  // Registrar subida de nivel en levellog [PREMIUM]
  void HoshikoLogger.sendToChannel(message.guild, "levellog", embed);

  const announceMode = config?.announceMode ?? "milestone";
  if (announceMode === "silent") return;
  if (announceMode === "milestone" && !milestone) return;

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
