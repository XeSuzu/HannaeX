const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Meme = require('../../../Database/meme');
const ServerConfig = require('../../../Models/serverConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memes-top')
    .setDescription('Muestra el top 10 de usuarios por reputación de memes.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const config = await ServerConfig.findOne({ guildId: interaction.guildId });
      if (!config || !config.memeChannelId) {
        return interaction.editReply({
          content: 'El canal de memes no está configurado. Usa `/setup-memes` primero.',
          ephemeral: true
        });
      }

      // Top 10 usuarios por puntos en el canal de memes
      const topUsers = await Meme.aggregate([
        { $match: { guildId: interaction.guildId, channelId: config.memeChannelId } },
        {
          $group: {
            _id: "$authorId",
            totalPoints: { $sum: "$points" }
          }
        },
        { $match: { totalPoints: { $gt: 0 } } }, // <-- Solo usuarios con puntos positivos
        { $sort: { totalPoints: -1 } },
        { $limit: 10 }
      ]);

      if (topUsers.length === 0) {
        const noMemesEmbed = new EmbedBuilder()
          .setColor('#EBA6D1')
          .setTitle('🏆 Top Reputación 🏆')
          .setDescription('¡Aún no hay memes en el ranking! Sube el tuyo y reacciona con 👍 para que entres en la lista.');
        return interaction.editReply({ embeds: [noMemesEmbed] });
      }

      // Obtener los nombres de usuario
      const userIds = topUsers.map(u => u._id);
      let members = {};
      try {
        members = await interaction.guild.members.fetch({ user: userIds });
      } catch {}

      const leaderboardEmbed = new EmbedBuilder()
        .setColor('#EBA6D1')
        .setTitle('🏆 Top 10 Usuarios por Reputación 🏆')
        .setDescription('¡Los creadores más divertidos del servidor!');

      for (let i = 0; i < topUsers.length; i++) {
        const userEntry = topUsers[i];
        const member = members.get ? members.get(userEntry._id) : null;
        const autorNombre = member ? member.user.username : 'Usuario Desconocido';
        leaderboardEmbed.addFields({
          name: `**#${i + 1}. ${autorNombre}**`,
          value: `Puntos: **${userEntry.totalPoints}**`,
          inline: false
        });
      }

      leaderboardEmbed
        .setTimestamp()
        .setFooter({ text: '¡Felicidades a los ganadores! 🎉' });

      await interaction.editReply({ embeds: [leaderboardEmbed] });

    } catch (error) {
      console.error('Error al obtener el ranking de memes:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('RED')
        .setTitle('¡Ups! Algo salió mal...')
        .setDescription('Ocurrió un error al intentar mostrar el ranking. Por favor, inténtalo de nuevo más tarde.');
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};