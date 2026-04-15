import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import GlobalLevel, { getTierForLevel } from "../../../Models/GlobalLevel";

export default {
  data: new SlashCommandBuilder()
    .setName("weekly-leaderboard")
    .setDescription("🏆 Top semanal de usuarios por XP (esta semana)")
    .addIntegerOption((o) =>
      o
        .setName("pagina")
        .setDescription("Página del ranking (1-50)")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const page = interaction.options.getInteger("pagina") ?? 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;

    // Solo usuarios con XP semanal > 0
    const totalUsers = await GlobalLevel.countDocuments({
      weeklyXp: { $gt: 0 },
    });

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🏆 Ranking Semanal")
            .setDescription(
              `Esta semana aún no hay actividad.\n\n` +
                `💬 ¡Sé el primero en ganar XP esta semana!`,
            )
            .setFooter({ text: "Hoshiko Weekly Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    const top = await GlobalLevel.find({ weeklyXp: { $gt: 0 } })
      .sort({ weeklyXp: -1 })
      .skip(skip)
      .limit(perPage);

    const medals = ["🥇", "🥈", "🥉"];
    const totalPages = Math.ceil(totalUsers / perPage);

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
        const displayName = user?.displayName ?? name;
        const tier = getTierForLevel(p.globalLevel);
        const position = skip + i + 1;
        const medal = medals[i] ?? `**#${position}**`;

        // Top 3 con más detalle
        if (position <= 3) {
          return (
            `${medal} **${displayName}** ${tier.emoji}\n` +
            `   └─ ${p.weeklyXp.toLocaleString()} XP semanal\n` +
            `   └─ ${p.weeklyMessages.toLocaleString()} mensajes`
          );
        } else {
          return `${medal} **${displayName}** — ${p.weeklyXp.toLocaleString()} XP • ${p.weeklyMessages.toLocaleString()} msgs`;
        }
      }),
    );

    // Calcular cuándo termina la semana
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🏆 Ranking Semanal — Semana Actual`)
      .setDescription(
        `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios activos**\n\n` +
          lines.join("\n\n"),
      )
      .addFields(
        {
          name: "⏰ Semana termina",
          value: `<t:${Math.floor(endOfWeek.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: "📖 Navegación",
          value:
            `Página **${page}** de **${totalPages}**\n` +
            `Usa \`/weekly-leaderboard pagina:${page < totalPages ? page + 1 : 1}\` para ver más`,
          inline: false,
        },
      )
      .setFooter({
        text: "Hoshiko Weekly Levels 🌸 • Reinicio semanal cada lunes",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
