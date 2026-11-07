import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { addWarning, getWarnings } from "../../../Database/moderation/warning.model";
import { createCase } from "../../../Database/moderation/case.model";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { Logger } from "../../../Utils/SystemLogger";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Envía una advertencia a un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a advertir.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("motivo")
        .setDescription("Razón de la advertencia.")
        .setMaxLength(512)
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!modPermCheck.ok) {
      await interaction.editReply({ content: modPermCheck.reason! });
      return;
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!botPermCheck.ok) {
      await interaction.editReply({ content: botPermCheck.reason! });
      return;
    }

    const target = interaction.options.getMember("usuario");
    const reason =
      interaction.options.getString("motivo") || "Sin motivo especificado.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.editReply({
        content: "❌ No pude encontrar a ese usuario en este servidor.",
      });
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

    try {
      await addWarning(
        interaction.guild.id,
        target.id,
        interaction.user.id,
        reason,
      );

      try {
        await target.user.send(
          `⚠️ **Has recibido una advertencia en ${interaction.guild.name}**\n\n**Motivo:** ${reason}`,
        );
      } catch {
        // Ignorar si el usuario tiene DMs desactivados
      }

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId: target.id,
          modId: interaction.user.id,
          action: "warn",
          reason,
          source: "manual",
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en warn:", err);
      }

      const total = (await getWarnings(interaction.guild.id, target.id)).length;

      await HoshikoLogger.logAction(interaction.guild, "WARN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        warnCount: total,
        caseId: caseNumber,
        source: "Comando",
      });

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Advertencia Enviada${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`Se ha advertido a **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          { name: "📊 Total de warns", value: `${total}`, inline: true },
          { name: "📝 Motivo", value: reason },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xffa500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • Advertencia registrada` : "Advertencia registrada" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /warn:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Logger.logCriticalError("WarnCommand", errorMsg);
      await interaction.editReply({
        content: "😿 Hubo un error al procesar la advertencia.",
      });
    }
  },
};

export default command;
