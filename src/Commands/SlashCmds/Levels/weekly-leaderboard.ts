import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("weekly-leaderboard")
    .setDescription("🏆 Top semanal de usuarios por XP en este servidor")
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

    // Solo usuarios de ESTE servidor con XP semanal > 0
    const totalUsers = await LocalLevel.countDocuments({
      guildId: interaction.guildId!,
      weeklyXp: { $gt: 0 },
    });

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🏆 Ranking Semanal Local")
            .setDescription(
              `Esta semana aún no hay actividad en este servidor.\n\n` +
                `💬 ¡Sé el primero en ganar XP esta semana!`,
            )
            .setFooter({ text: "Hoshiko Weekly Local Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    const top = await LocalLevel.find({
      guildId: interaction.guildId!,
      weeklyXp: { $gt: 0 },
    })
      .sort({ weeklyXp: -1, weeklyMessages: -1, xp: -1 })
      .skip(skip)
      .limit(perPage);

    const medals = ["🥇", "🥈", "🥉"];
    const totalPages = Math.ceil(totalUsers / perPage);

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
        const displayName = user?.displayName ?? name;
        const position = skip + i + 1;
        const medal = medals[i] ?? `**#${position}**`;

        const level = Math.max(0, p.level ?? 0);
        const weeklyXp = Math.max(0, p.weeklyXp ?? 0);
        const weeklyMessages = Math.max(0, p.weeklyMessages ?? 0);

        if (position <= 3) {
          return (
            `${medal} **${displayName}**\n` +
            `   └─ Nivel ${level}\n` +
            `   └─ ${weeklyXp.toLocaleString()} XP semanal\n` +
            `   └─ ${weeklyMessages.toLocaleString()} mensajes`
          );
        } else {
          return `${medal} **${displayName}** — Nivel ${level} • ${weeklyXp.toLocaleString()} XP • ${weeklyMessages.toLocaleString()} msgs`;
        }
      }),
    );

    // Fin de semana (domingo 23:59)
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(
        `🏆 Ranking Semanal Local — ${interaction.guild?.name || "Servidor"}`,
      )
      .setDescription(
        `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios activos esta semana**\n\n` +
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
        text: "Hoshiko Weekly Local Levels 🌸 • Reinicio semanal cada lunes",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
