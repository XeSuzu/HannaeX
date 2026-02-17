import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confession-unban")
    .setDescription("✅ Retira el veto de confesiones a un usuario")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario a desbloquear")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("usuario", true);

    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });

    // Si no hay config o blacklist vacía o no está en la lista
    if (
      !settings ||
      !settings.confessions ||
      !settings.confessions.blacklist ||
      !settings.confessions.blacklist.includes(targetUser.id)
    ) {
      return interaction.editReply(
        `⚠️ El usuario **${targetUser.tag}** no estaba vetado.`,
      );
    }

    // REMOVER DE BLACKLIST (Filtrando el array)
    settings.confessions.blacklist = settings.confessions.blacklist.filter(
      (id) => id !== targetUser.id,
    );

    settings.markModified("confessions");
    await settings.save();

    return interaction.editReply(
      `✅ **${targetUser.tag}** ha sido removido de la blacklist. Ya puede confesar de nuevo.`,
    );
  },
};
