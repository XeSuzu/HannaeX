import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import {
  deleteWarning,
  getWarnings,
  IWarning,
} from "../../../Database/moderation/warning.model";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import {
  canModerateTarget,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
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
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!modPermCheck.ok) {
      await interaction.editReply({ content: modPermCheck.reason! });
      return;
    }

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;
      const warnId = interaction.options.getString("id", true).trim();

      if (!target) {
        await interaction.editReply({ content: "❌ No pude encontrar a ese usuario." });
        return;
      }

      const targetCheck = canModerateTarget(
        interaction.member as GuildMember,
        target,
      );
      if (!targetCheck.canModerate) {
        await interaction.editReply({ content: targetCheck.reason! });
        return;
      }

      const warnings = await getWarnings(interaction.guild.id, target.id);
      const match = warnings.find((w: IWarning) =>
        (w as any)._id.toString().endsWith(warnId)
      );

      if (!match) {
        await interaction.editReply({ content: `❌ No encontré un warn con ID \`${warnId}\` para ese usuario.` });
        return;
      }

      const deleted = await deleteWarning(interaction.guild.id, (match as any)._id.toString());

      if (!deleted) {
        await interaction.editReply({ content: "❌ No se pudo eliminar el warn. Intenta de nuevo." });
        return;
      }

      await HoshikoLogger.logAction(interaction.guild, "UNWARN", {
        user: target.user,
        moderator: interaction.user,
        reason: `Warn eliminado: ${match.reason}`,
        source: "Comando",
        extra: `ID del warn: ${warnId}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("✨ Advertencia Eliminada")
        .setDescription(`Se eliminó el warn \`${warnId}\` de **${target.user.tag}**.`)
        .addFields(
          { name: "📝 Motivo original", value: match.reason, inline: false },
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "🆔 IDs", value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0x00ff7f)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /unwarn:", error);
      await interaction.editReply({ content: "😿 Hubo un error al eliminar la advertencia." });
    }
  },
};

export default command;
