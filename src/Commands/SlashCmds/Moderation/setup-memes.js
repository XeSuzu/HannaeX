const { SlashCommandBuilder } = require("@discordjs/builders");
const ServerConfig = require("../../../Models/serverConfig"); // Importa el modelo
const { PermissionsBitField } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-memes")
    .setDescription("Define el canal de memes para este servidor.")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("El canal de texto donde se subirán los memes.")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Verificar si el usuario tiene permiso de administrador
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      return interaction.reply({
        content: "Solo los administradores pueden usar este comando.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("canal");
    const guildId = interaction.guildId;

    try {
      // Guardar o actualizar la configuración en la base de datos
      await ServerConfig.findOneAndUpdate(
        { guildId: guildId },
        { memeChannelId: channel.id },
        { upsert: true, new: true }, // upsert: si no existe, lo crea
      );

      interaction.reply(
        `¡El canal de memes se ha configurado a ${channel} con éxito!`,
      );
    } catch (error) {
      console.error("Error al configurar el canal de memes:", error);
      interaction.reply(
        "Ocurrió un error al intentar guardar la configuración. Por favor, inténtalo de nuevo.",
      );
    }
  },
};
