import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import GlobalLevel, { getTierForLevel } from "../../../Database/leveling/globalLevel.model";

export default {
  data: new SlashCommandBuilder()
    .setName("global-leaderboard")
    .setDescription("🌐 Top global de usuarios por XP (todos los servidores)")
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

    const totalUsers = await GlobalLevel.countDocuments();

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🌐 Global Leaderboard")
            .setDescription(
              `Aún no hay usuarios en el ranking global.\n\n` +
                `💬 ¡Sé el primero en ganar XP y aparecer aquí!`,
            )
            .setFooter({ text: "Hoshiko Global Levels ✨" })
            .setTimestamp(),
        ],
      });
    }

    // Ordenar por globalLevel y globalXp como desempate
    const top = await GlobalLevel.find()
      .sort({ globalLevel: -1, globalXp: -1 })
      .skip(skip)
      .limit(perPage);

    const medals = ["🥇", "🥈", "🥉"];
    const totalPages = Math.ceil(totalUsers / perPage);

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name = user?.username ?? `Unknown #${p.userId.slice(0, 6)}`;
        const displayName = user?.displayName ?? name;
        const tier = getTierForLevel(p.globalLevel);
        const position = skip + i + 1;
        const medal = medals[i] ?? `**#${position}**`;

        const globalLevel = Math.max(0, p.globalLevel ?? 0);
        const globalXp = Math.max(0, p.globalXp ?? 0);

        if (position === 1) {
          return (
            `${medal} **${displayName}** ${tier.emoji}\n` +
            `   └─ **${tier.name}** (${tier.nameJp})\n` +
            `   └─ Nivel Global ${globalLevel} • ${globalXp.toLocaleString()} XP`
          );
        } else if (position <= 3) {
          return `${medal} **${displayName}** ${tier.emoji} — Nivel ${globalLevel} • ${globalXp.toLocaleString()} XP`;
        } else {
          return `${medal} **${displayName}** ${tier.emoji} — Lv.${globalLevel} • ${globalXp.toLocaleString()} XP`;
        }
      }),
    );

    const topTier = getTierForLevel(top[0]?.globalLevel ?? 0);

    const embed = new EmbedBuilder()
      .setColor(topTier.color)
      .setTitle(`${topTier.emoji} Global Leaderboard ${topTier.emoji}`)
      .setDescription(
        `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios**\n\n` +
          lines.join("\n\n"),
      )
      .addFields(
        {
          name: "📖 Navegación",
          value:
            `Página **${page}** de **${totalPages}**\n` +
            `Usa \`/global-leaderboard pagina:${page < totalPages ? page + 1 : 1}\` para ver más`,
          inline: false,
        },
        {
          name: "💡 Info",
          value:
            "El XP global se acumula por actividad de texto en todos los servidores.",
          inline: false,
        },
      )
      .setFooter({ text: "Hoshiko Global Levels ✨" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
