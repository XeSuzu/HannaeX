import { EmbedBuilder } from "discord.js";
import { getAchievement, GLOBAL_TIERS } from "../../Models/GlobalLevel";

export async function announceAchievements(
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

export async function announceGlobalLevelUp(
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

export async function announceGlobalTierUp(
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

