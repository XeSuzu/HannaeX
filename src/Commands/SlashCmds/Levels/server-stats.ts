import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("server-stats")
    .setDescription("📊 Estadísticas de niveles en este servidor"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const guildId = interaction.guildId!;
    const guild = interaction.guild!;

    // Total de usuarios con niveles
    const totalUsers = await LocalLevel.countDocuments({ guildId });

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`📊 Stats de ${guild.name}`)
            .setDescription(
              `Aún no hay usuarios con niveles en este servidor.\n\n` +
                `💬 ¡Sé el primero en ganar XP!`,
            )
            .setFooter({ text: "Hoshiko Server Stats 🌸" })
            .setTimestamp(),
        ],
      });
    }

    // Estadísticas agregadas
    const stats = await LocalLevel.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          totalXp: { $sum: "$xp" },
          totalMessages: { $sum: "$messagesSent" },
          totalVoiceMinutes: { $sum: "$voiceMinutes" },
          avgLevel: { $avg: "$level" },
          maxLevel: { $max: "$level" },
          totalVoiceXp: { $sum: "$voiceXp" },
        },
      },
    ]);

    const stat = stats[0] || {
      totalXp: 0,
      totalMessages: 0,
      totalVoiceMinutes: 0,
      avgLevel: 0,
      maxLevel: 0,
      totalVoiceXp: 0,
    };

    // Top 3 usuarios
    const topUsers = await LocalLevel.find({ guildId })
      .sort({ xp: -1 })
      .limit(3);

    const topList = await Promise.all(
      topUsers.map(async (user, i) => {
        const discordUser = await client.users
          .fetch(user.userId)
          .catch(() => null);
        const name =
          discordUser?.username || `Usuario ${user.userId.slice(0, 8)}`;
        const medal = ["🥇", "🥈", "🥉"][i] || "🏅";
        return `${medal} **${name}** - Nivel ${user.level} (${user.xp.toLocaleString()} XP)`;
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL() ?? undefined,
      })
      .setTitle(`📊 Estadísticas de ${guild.name}`)
      .setThumbnail(guild.iconURL() ?? null)
      .setDescription(
        `Resumen de la actividad de niveles en este servidor. ` +
          `Estos datos se actualizan con cada consulta.`,
      )
      .addFields(
        {
          name: "👥 Usuarios Activos",
          value: `${totalUsers.toLocaleString()}`,
          inline: true,
        },
        {
          name: "📈 Nivel Promedio",
          value: `${stat.avgLevel.toFixed(1)}`,
          inline: true,
        },
        {
          name: "🏆 Nivel Máximo",
          value: `${stat.maxLevel}`,
          inline: true,
        },
        {
          name: "💬 Mensajes Totales",
          value: `${stat.totalMessages.toLocaleString()}`,
          inline: true,
        },
        {
          name: "🎤 Minutos de Voz Totales",
          value: `${stat.totalVoiceMinutes.toLocaleString()}`,
          inline: true,
        },
        {
          name: "⚡ XP Total",
          value: `${stat.totalXp.toLocaleString()}`,
          inline: true,
        },
        {
          name: "🏅 Top 3 Usuarios",
          value: topList.join("\n") || "No hay datos suficientes",
          inline: false,
        },
      )
      .setFooter({
        text: "Hoshiko Server Stats 🌸 • Actualizado en tiempo real",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
