import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import GlobalLevel, {
  ACHIEVEMENTS,
  getTierForLevel,
  GLOBAL_TIERS,
} from "../../../Models/GlobalLevel";

export default {
  data: new SlashCommandBuilder()
    .setName("tiers")
    .setDescription("🌸 Ver todos los tiers/rangos globales disponibles"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply();

    // Obtener el nivel global del usuario si existe
    const globalProfile = await GlobalLevel.findOne({
      userId: interaction.user.id,
    });
    const userLevel = globalProfile?.globalLevel ?? 0;
    const userTier = getTierForLevel(userLevel);
    const userTierIndex = GLOBAL_TIERS.findIndex(
      (t) => t.tier === userTier.tier,
    );

    // Construir lista de tiers KAWAI
    const tierLines = GLOBAL_TIERS.map((tier, index) => {
      const isUnlocked = userLevel >= tier.minLevel;
      const isCurrent = tier.tier === userTier.tier;
      const isPast = index < userTierIndex;

      let status = "";
      if (isCurrent) {
        status = " ⭐ 現在の / Current";
      } else if (isPast) {
        status = " ✅ 達成済み / Unlocked";
      } else if (isUnlocked) {
        status = " 🔓 開放 / Unlocked";
      } else {
        status = " 🔒 未達成 / Locked";
      }

      const levelReq = index === 0 ? "初期 / Initial" : `Lv.${tier.minLevel}`;

      return (
        `${tier.emoji} **${tier.name}** ${tier.emoji}\n` +
        `   ${tier.nameJp} • ${levelReq}${status}\n` +
        `   └─ ${tier.description}`
      );
    });

    // Progreso al siguiente tier
    let nextTierInfo = "";
    let progressInfo = "";

    if (userTierIndex < GLOBAL_TIERS.length - 1) {
      const nextTier = GLOBAL_TIERS[userTierIndex + 1];
      const levelsNeeded = nextTier.minLevel - userLevel;

      // Calcular progreso en el tier actual
      const prevLevel =
        userTierIndex > 0 ? GLOBAL_TIERS[userTierIndex - 1].minLevel : 0;
      const levelsInCurrentTier = userLevel - prevLevel;
      const levelsInTier = nextTier.minLevel - prevLevel;
      const tierProgress = Math.floor(
        (levelsInCurrentTier / levelsInTier) * 100,
      );

      nextTierInfo =
        `\n**🔮 次のTier / Next Tier:**\n` +
        `${nextTier.emoji} **${nextTier.name}** ${nextTier.emoji}\n` +
        `${nextTier.nameJp} — Lv.${nextTier.minLevel}\n` +
        `レベル **${levelsNeeded}** あと / **${levelsNeeded}** levels remaining~`;

      progressInfo = `📊 進行状況 / Progress: **${tierProgress}%**`;
    } else {
      nextTierInfo = `\n${userTier.emoji} ¡MAX TIER! 全Tier達成! ${userTier.emoji}`;
      progressInfo = "✨ 汝はもう神桜なり / You are the Divine Sakura~";
    }

    // Logros disponibles
    const achievementLines = ACHIEVEMENTS.slice(0, 5)
      .map((ach, i) => {
        const unlocked = globalProfile?.achievements.includes(ach.id);
        const status = unlocked ? "✅" : "🔒";
        return `${status} ${ach.emoji} **${ach.name}** — ${ach.nameEn}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(userTier.color)
      .setTitle(
        `${userTier.emoji} 🌸 ティアシステム / TIER SYSTEM 🌸 ${userTier.emoji}`,
      )
      .setDescription(
        `あなたのTier / Your Tier: **${userTier.name}** (${userTier.nameJp}) ${userTier.emoji}\n` +
          `レベル / Level: **${userLevel}** ${progressInfo}\n\n` +
          `**🌸 全Tier一覧 / All Tiers:**\n\n` +
          tierLines.join("\n\n") +
          nextTierInfo,
      )
      .addFields({
        name: "📜 利用可能な実績 / Available Achievements",
        value:
          achievementLines +
          `\n\n*+${ACHIEVEMENTS.length - 5} more achievements hidden~*`,
        inline: false,
      })
      .addFields({
        name: "💡 ヒント / Tips",
        value:
          "• XPグローバルは全てのサーバーで獲得可能 / XP global earned in all servers\n" +
          "• ティ어는レベル全球に基づいて自動解除 / Tiers auto-unlock based on global level\n" +
          "• 神桜 (Lv.500) が最後のTier! / Divine Sakura (Lv.500) is the final tier!",
        inline: false,
      })
      .setFooter({ text: "Hoshiko Global Levels ✨" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
