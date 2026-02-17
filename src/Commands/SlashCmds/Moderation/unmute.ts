import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { userPoints } from "../../../Features/InfractionManager";

export default {
  // ✨ Definimos los datos para que Discord lo reconozca como Slash Command
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Limpia las infracciones y quita el silencio a un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario que recibirá el perdón de Hoshiko.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // Obtenemos al usuario de las opciones del comando
    const target = interaction.options.getMember("usuario") as GuildMember;

    if (!target) {
      return interaction.reply({
        content: "🌸 Nyaa... no pude encontrar a ese usuario en este servidor.",
        ephemeral: true,
      });
    }

    const key = `${interaction.guild.id}-${target.id}`;

    try {
      // 1. Limpiamos sus puntos en la memoria de Hoshiko 📝
      userPoints.delete(key);

      // 2. Quitamos el timeout de Discord si lo tiene ⏳
      if (target.communicationDisabledUntilTimestamp) {
        await target.timeout(null, `Perdonado por ${interaction.user.tag}`);
      }

      const embed = new EmbedBuilder()
        .setTitle("✨ Hoshiko Perdona")
        .setDescription(
          `Se han limpiado las infracciones de **${target.user.tag}**. ¡Espero que haya aprendido su lección! 🌸`,
        )
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x00ff7f)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Error en comando unmute:", err);
      await interaction.reply({
        content:
          "🌸 Hubo un problemita al intentar perdonar al usuario. Revisa mis permisos.",
        ephemeral: true,
      });
    }
  },
};
