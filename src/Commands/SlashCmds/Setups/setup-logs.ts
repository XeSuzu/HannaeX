import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("📜 Configura el canal para registros de auditoría (Logs)")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("El canal donde llegarán los avisos")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("canal");

    // 1. Buscamos la configuración del servidor
    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });

    // Si no existe, la creamos
    if (!settings)
      settings = new ServerConfig({ guildId: interaction.guildId });

    // 2. Guardamos el ID del canal en la base de datos
    settings.modLogChannel = channel!.id;
    await settings.save();

    return interaction.editReply(
      `✅ **Logs Configurados:** Ahora enviaré los reportes de seguridad y roles a ${channel}.`,
    );
  },
};
