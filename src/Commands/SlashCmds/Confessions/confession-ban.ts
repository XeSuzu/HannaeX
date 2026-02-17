import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confession-ban")
    .setDescription("🚫 Veta a un usuario de las publicaciones (Blacklist)")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario a bloquear")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("motivo")
        .setDescription("Razón del bloqueo (para logs)")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("usuario", true);
    const reason =
      interaction.options.getString("motivo") ||
      "Violación de normas de comunidad";

    // Validaciones de lógica
    if (targetUser.id === interaction.user.id)
      return interaction.editReply(
        "❌ **Error de lógica:** No puedes vetarte a ti mismo.",
      );
    if (targetUser.bot)
      return interaction.editReply(
        "❌ **Error:** Los bots no pueden ser vetados (no confiesan).",
      );

    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    if (!settings)
      settings = new ServerConfig({ guildId: interaction.guildId });

    // Inicializar array si no existe
    if (!settings.confessions.blacklist) {
      settings.confessions.blacklist = [];
    }

    // Verificar si ya está vetado
    if (settings.confessions.blacklist.includes(targetUser.id)) {
      return interaction.editReply(
        `⚠️ El usuario **${targetUser.tag}** ya tiene el acceso restringido.`,
      );
    }

    // AGREGAR A BLACKLIST
    settings.confessions.blacklist.push(targetUser.id);

    settings.markModified("confessions");
    await settings.save();

    // 🎨 DISEÑO HOSHIKO UI (Alerta Roja)
    const embed = new EmbedBuilder()
      .setTitle("🚫 ACCESO REVOCADO")
      .setColor("#ED4245") // Rojo intenso (Discord Red)
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/497/497738.png") // Signo de prohibido
      .setDescription(
        `Se ha aplicado una restricción de seguridad sobre el usuario.`,
      )
      .addFields(
        {
          name: "👤 Usuario Sancionado",
          value: `**${targetUser.tag}**\n\`${targetUser.id}\``,
          inline: true,
        },
        {
          name: "⚖️ Motivo del Veto",
          value: `\`${reason}\``,
          inline: true,
        },
      )
      .setFooter({
        text: "El usuario ya no podrá interactuar con el sistema de publicaciones.",
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
