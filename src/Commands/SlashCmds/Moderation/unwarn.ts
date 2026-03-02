import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";
import { deleteWarning, IWarning } from "../../../Models/Warning";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("Elimina una advertencia específica por su ID.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario al que pertenece el warn.")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("Últimos 6 caracteres del ID del warn (visible en /warnings).")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) return;

    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;
      const warnId = interaction.options.getString("id", true).trim();

      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario.");
        return;
      }

      // El ID que el usuario ve en /warnings son los últimos 6 chars del ObjectId
      // Necesitamos buscar el warn completo para obtener el _id real
      const { getWarnings } = await import("../../../Models/Warning.js");
      const warnings = await getWarnings(interaction.guild.id, target.id);
      const match = warnings.find((w: IWarning) =>
        (w as any)._id.toString().endsWith(warnId)
      );

      if (!match) {
        await interaction.editReply(`❌ No encontré un warn con ID \`${warnId}\` para ese usuario.`);
        return;
      }

      const deleted = await deleteWarning(interaction.guild.id, (match as any)._id.toString());

      if (!deleted) {
        await interaction.editReply("❌ No se pudo eliminar el warn. Intenta de nuevo.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("✨ Advertencia Eliminada")
        .setDescription(`Se eliminó el warn \`${warnId}\` de **${target.user.tag}**.`)
        .addFields(
          { name: "📝 Motivo original", value: match.reason, inline: false },
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor(0x00ff7f)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /unwarn:", error);
      await interaction.editReply("😿 Hubo un error al eliminar la advertencia.");
    }
  },
};

export default command;