const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Meme = require("../../../Database/meme"); // Importa el modelo de meme

module.exports = {
  // Define el comando
  data: new SlashCommandBuilder()
    .setName("mi-reputacion")
    .setDescription("Muestra tu meme más votado y tu reputación de memes."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }); // Muestra el estado "El bot está pensando..."

    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      // 1. Encontrar el meme más votado del usuario
      const topMeme = await Meme.findOne({
        authorId: userId,
        guildId: guildId,
      }).sort({ points: -1 });

      // 2. Calcular la reputación total del usuario
      const totalPointsResult = await Meme.aggregate([
        { $match: { authorId: userId, guildId: guildId } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
          },
        },
      ]);

      const totalReputacion =
        totalPointsResult.length > 0 ? totalPointsResult[0].totalPoints : 0;

      // Si el usuario no tiene memes, envía un mensaje amigable
      if (!topMeme) {
        const noMemesEmbed = new EmbedBuilder()
          .setColor("#EBA6D1")
          .setTitle("😽 Tu Reputación de Memes 😽")
          .setDescription(
            `¡Hola, **${interaction.user.username}**!\nAún no tienes memes en el ranking.\n¡Sube uno y reacciona con 👍 para comenzar a ganar reputación!`,
          );

        return interaction.editReply({ embeds: [noMemesEmbed] });
      }

      // 3. Crear el mensaje final con el embed
      const memeEmbed = new EmbedBuilder()
        .setColor("#EBA6D1")
        .setTitle(`✨ Reputación de ${interaction.user.username} ✨`)
        .setDescription(`**Puntos de Reputación:** ${totalReputacion}`)
        .addFields({
          name: "Tu Meme Más Votado:",
          value: `Puntos: ${topMeme.points}\n[Ver meme](${topMeme.memeUrl})`,
          inline: false,
        })
        .setImage(topMeme.memeUrl)
        .setTimestamp()
        .setFooter({ text: "Nyaa~ 🐾" });

      await interaction.editReply({ embeds: [memeEmbed] });
    } catch (error) {
      console.error("Error al obtener la reputación de memes:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor("RED")
        .setTitle("¡Ups! Algo salió mal...")
        .setDescription(
          "Ocurrió un error al intentar mostrar la reputación. Por favor, inténtalo de nuevo más tarde.",
        );

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
