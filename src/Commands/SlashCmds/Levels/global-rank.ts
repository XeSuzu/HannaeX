import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import GlobalLevel, {
  getAchievement,
  getTierForLevel,
  GLOBAL_TIERS,
  globalTotalXpForLevel,
  globalXpForLevel,
} from "../../../Models/GlobalLevel";

export default {
  data: new SlashCommandBuilder()
    .setName("globalrank")
    .setDescription("🌸 Ver tu rango y stats globales en todos los servidores")
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Usuario a consultar")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;

    await interaction.deferReply();

    const globalProfile = await GlobalLevel.findOne({ userId: target.id });

    if (!globalProfile) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`🌸 Perfil Global de ${target.displayName}`)
            .setDescription(
              `**${target.displayName}** aún no tiene actividad global.\n\n` +
                `💬 Participa en servidores con Hoshiko para ganar XP global~`,
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: "Hoshiko Global Levels ✨" })
            .setTimestamp(),
        ],
      });
    }

    const tier = getTierForLevel(globalProfile.globalLevel);
    const currentLevelXp = globalTotalXpForLevel(globalProfile.globalLevel);
    const nextLevelXp = globalTotalXpForLevel(globalProfile.globalLevel + 1);
    const xpIntoLevel = globalProfile.globalXp - currentLevelXp;
    const xpNeeded = globalXpForLevel(globalProfile.globalLevel);
    const progressPercent = Math.min(
      100,
      Math.floor((xpIntoLevel / xpNeeded) * 100),
    );
    const bar = buildProgressBar(progressPercent, tier.color);

    // Rank global
    const rank =
      (await GlobalLevel.countDocuments({
        globalXp: { $gt: globalProfile.globalXp },
      })) + 1;

    const totalUsers = await GlobalLevel.countDocuments({});
    const xpToNextLevel = nextLevelXp - globalProfile.globalXp;

    // Logros con formato kawaii
    const achievementsList = globalProfile.achievements
      .slice(0, 6) // Máximo 6 logros visibles
      .map((a: string) => {
        const ach = getAchievement(a);
        return ach ? `${ach.emoji}` : "🏅";
      })
      .join(" ");

    const achievementsText = achievementsList || "Sin logros aún 🐾";
    const moreAchievements =
      globalProfile.achievements.length > 6
        ? ` +${globalProfile.achievements.length - 6} más`
        : "";

    // Próximo tier
    const currentTierIndex = GLOBAL_TIERS.findIndex(
      (t) => t.tier === tier.tier,
    );
    const nextTier =
      currentTierIndex < GLOBAL_TIERS.length - 1
        ? GLOBAL_TIERS[currentTierIndex + 1]
        : null;
    const levelsToNextTier = nextTier
      ? nextTier.minLevel - globalProfile.globalLevel
      : 0;

    const embed = new EmbedBuilder()
      .setColor(tier.color)
      .setAuthor({
        name: `${tier.emoji} ${target.displayName} — ${tier.name} ${tier.emoji}`,
        iconURL: target.displayAvatarURL(),
      })
      .setTitle(`レベル ${globalProfile.globalLevel} — ${tier.nameJp}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        {
          name: `${tier.emoji} Tier Actual`,
          value: `**${tier.name}** (${tier.nameJp})\n${tier.description}`,
          inline: true,
        },
        {
          name: "🌐 Ranking Global",
          value: `**#${rank}** / ${totalUsers.toLocaleString()}人中`,
          inline: true,
        },
        {
          name: "💬 メッセージ",
          value: `\`${globalProfile.totalMessages.toLocaleString()}\` mensajes`,
          inline: true,
        },
        {
          name: "⚡ XP Global",
          value: `\`${globalProfile.globalXp.toLocaleString()}\` XP`,
          inline: true,
        },
        {
          name: "📈 プログレス",
          value: bar,
          inline: false,
        },
        {
          name: "🎯 次のレベル",
          value:
            `${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP (**${progressPercent}%**)\n` +
            `レベル ${globalProfile.globalLevel + 1} まで後 **${xpToNextLevel.toLocaleString()}** XP`,
          inline: false,
        },
        {
          name: nextTier
            ? `🔓 次のTier: ${nextTier.emoji} ${nextTier.name}`
            : "✨ Max Tier!",
          value: nextTier
            ? `レベル ${nextTier.minLevel} で解放 (残り ${levelsToNextTier} レベル)`
            : "全てのTierをアンロック済み! 🎊",
          inline: false,
        },
        {
          name: "📅 今週 / This Week",
          value: `XP: \`${globalProfile.weeklyXp.toLocaleString()}\` • Mensajes: \`${globalProfile.weeklyMessages.toLocaleString()}\``,
          inline: true,
        },
        {
          name: `🏆 実績 ${globalProfile.achievements.length}/10`,
          value: achievementsText + moreAchievements,
          inline: true,
        },
      )
      .setFooter({
        text: `Hoshiko Global Levels ✨ • ${interaction.guild?.name || "Multi-Server"}`,
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

function buildProgressBar(percent: number, color: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;

  // Usar caracteres especiales para la barra
  return (
    "```" +
    "▓".repeat(Math.max(0, filled)) +
    "░".repeat(Math.max(0, empty)) +
    "``` " +
    `**${percent}%**`
  );
}
