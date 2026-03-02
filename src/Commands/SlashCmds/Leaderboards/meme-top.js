const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Meme = require("../../../Database/meme");
const ServerConfig = require("../../../Models/serverConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meme-top")
    .setDescription("Muestra el meme más votado del servidor."),

  async execute(interaction) {
    // ❌ ELIMINADO: await interaction.deferReply();

    try {
      // Buscar el meme más votado solo por el ID del servidor
      const topMeme = await Meme.findOne({
        guildId: interaction.guildId,
      }).sort({ points: -1, _id: -1 });

      if (!topMeme) {
        const noMemesEmbed = new EmbedBuilder()
          .setColor("#EBA6D1")
          .setTitle("🏆 Meme del Servidor 🏆")
          .setDescription(
            "¡Aún no hay memes en el ranking! Sube el tuyo y reacciona con 👍 para que aparezca aquí.",
          );
        return interaction.editReply({ embeds: [noMemesEmbed] });
      }

      let autorNombre = "Usuario Desconocido";
      try {
        const member = await interaction.guild.members.fetch(topMeme.authorId);
        if (member) autorNombre = member.user.username;
      } catch {}

      const memeEmbed = new EmbedBuilder()
        .setColor("#EBA6D1")
        .setTitle(`🏆 El Meme Más Votado 🏆`)
        .setDescription(
          `**Autor:** ${autorNombre}\n**Puntos:** ${topMeme.points}\n¡Vota para que cambie! 😉`,
        )
        .setImage(topMeme.memeUrl)
        .setTimestamp()
        .setFooter({ text: "Nyaa~ 🐾" });

      await interaction.editReply({ embeds: [memeEmbed] });
    } catch (error) {
      console.error("Error al obtener el ranking de memes:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor("RED")
        .setTitle("¡Ups! Algo salió mal...")
        .setDescription(
          "Ocurrió un error al intentar mostrar el meme. Por favor, inténtalo de nuevo más tarde.",
        );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
