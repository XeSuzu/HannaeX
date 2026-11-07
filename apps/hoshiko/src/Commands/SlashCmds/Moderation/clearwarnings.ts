import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { clearWarnings } from "../../../Database/moderation/warning.model";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import {
  canModerateTarget,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Elimina todas las advertencias de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario al que limpiar las advertencias.")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.editReply("❌ Este comando solo se puede usar dentro de un servidor.");
      return;
    }

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.ManageGuild,
    );
    if (!modPermCheck.ok) {
      await interaction.editReply(modPermCheck.reason!);
      return;
    }

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;

      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario en el servidor.");
        return;
      }

      const targetCheck = canModerateTarget(
        interaction.member as GuildMember,
        target,
      );
      if (!targetCheck.canModerate) {
        await interaction.editReply(targetCheck.reason!);
        return;
      }

      const deleted = await clearWarnings(interaction.guild.id, target.id);

      if (deleted === 0) {
        await interaction.editReply(`ℹ️ **${target.user.tag}** no tenía advertencias registradas.`);
        return;
      }

      await HoshikoLogger.logAction(interaction.guild, "UNWARN", {
        user: target.user,
        moderator: interaction.user,
        reason: `Se limpiaron todas las advertencias (${deleted})`,
        source: "Comando",
        actionLabel: "Limpieza de advertencias",
        warnCount: 0,
      });

      const embed = new EmbedBuilder()
        .setTitle("🧹 Advertencias Limpiadas")
        .setDescription(`Se eliminaron **${deleted}** advertencia(s) de **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor(0x00ff7f)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /clearwarnings:", error);
      await interaction.editReply("😿 Hubo un error interno al limpiar las advertencias de la base de datos.");
    }
  },
};

export default command;