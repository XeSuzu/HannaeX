import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import GlobalLevel, { getTierForLevel } from "../../../Models/GlobalLevel";

export default {
  data: new SlashCommandBuilder()
    .setName("global-leaderboard")
    .setDescription("🏆 Top global de usuarios por XP (todos los servidores)")
    .addIntegerOption((o) =>
      o
        .setName("pagina")
        .setDescription("Página del ranking (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const page = interaction.options.getInteger("pagina") ?? 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;

    const totalUsers = await GlobalLevel.countDocuments({});

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🏆 グローバルランキング / Global Leaderboard")
            .setDescription(
              `まだランキングにユーザーがいません。\n` +
                `まだユーザーはいません / No users yet.\n\n` +
                `💬 最初のXPグローバル獲得者になろう! / Be the first to earn global XP!`,
            )
            .setFooter({ text: "Hoshiko Global Levels ✨" })
            .setTimestamp(),
        ],
      });
    }

    const top = await GlobalLevel.find({})
      .sort({ globalXp: -1 })
      .skip(skip)
      .limit(perPage);

    const medals = ["🥇", "🥈", "🥉"];
    const totalPages = Math.ceil(totalUsers / perPage);

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name =
          user?.username ?? `Unknown / 不明 #${p.userId.slice(0, 6)}`;
        const displayName = user?.displayName ?? name;
        const tier = getTierForLevel(p.globalLevel);
        const position = skip + i + 1;
        const medal = medals[i] ?? `${position}位`;

        // Top 3 con estilo especial
        if (position === 1) {
          return (
            `🥇 **${displayName}** ${tier.emoji}\n` +
            `   └─ Lv.${p.globalLevel} • ${p.globalXp.toLocaleString()} XP\n` +
            `   └─ ${tier.name} (${tier.nameJp})`
          );
        } else if (position === 2) {
          return (
            `🥈 **${displayName}** ${tier.emoji}\n` +
            `   └─ Lv.${p.globalLevel} • ${p.globalXp.toLocaleString()} XP`
          );
        } else if (position === 3) {
          return (
            `🥉 **${displayName}** ${tier.emoji}\n` +
            `   └─ Lv.${p.globalLevel} • ${p.globalXp.toLocaleString()} XP`
          );
        } else {
          return `${position}位. **${displayName}** ${tier.emoji} — Lv.${p.globalLevel} • ${p.globalXp.toLocaleString()} XP`;
        }
      }),
    );

    // Obtener el tier del #1
    const topTier = getTierForLevel(top[0]?.globalLevel || 0);
    const topUser = top[0]
      ? await client.users.fetch(top[0].userId).catch(() => null)
      : null;

    const embed = new EmbedBuilder()
      .setColor(topTier.color)
      .setTitle(`${topTier.emoji} 🌸 グローバルランキング 🌸 ${topTier.emoji}`)
      .setDescription(
        `**${skip + 1}-${Math.min(skip + perPage, totalUsers)}位 / Ranking** of ${totalUsers.toLocaleString()}人中 / users\n\n` +
          lines.join("\n\n"),
      )
      .addFields({
        name: "📖 ナビゲーション / Navigation",
        value:
          `ページ / Page **${page}** / **${totalPages}**\n` +
          `コマンド / Use: \`/global-leaderboard pagina:${page < totalPages ? page + 1 : 1}\``,
        inline: false,
      })
      .addFields({
        name: "💡 ヒント / Tips",
        value:
          "XP全球は全てのサーバーで累積 / Global XP accumulates across all servers~\n" +
          "各サーバーでアクティブに話そう! / Be active in servers!",
        inline: false,
      })
      .setFooter({ text: "Hoshiko Global Levels ✨" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
