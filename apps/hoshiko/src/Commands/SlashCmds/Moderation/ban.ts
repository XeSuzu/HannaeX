import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import { AutomodManager } from "../../../Features/AutomodManager";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { createCase } from "../../../Database/moderation/case.model";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a banear.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón del ban.").setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("eliminar-mensajes")
        .setDescription("Eliminar mensajes de los últimos 7 días.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.BanMembers,
    );
    if (!modPermCheck.ok) {
      await interaction.editReply({
        content: modPermCheck.reason!,
      });
      return;
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.BanMembers,
    );
    if (!botPermCheck.ok) {
      await interaction.editReply({
        content: botPermCheck.reason!,
      });
      return;
    }

    const target = interaction.options.getMember("usuario");
    const reason =
      interaction.options.getString("razon") || "No se especificó un motivo.";
    const deleteMessages =
      interaction.options.getBoolean("eliminar-mensajes") ?? false;

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
      await interaction.editReply({
        content: targetCheck.reason!,
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;

      HoshikoLogger.markBotModerationAction(interaction.guild.id, "BAN", targetId);

      await target.ban({
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteMessages ? 604800 : 0,
      });

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "ban",
        `Ban manual por ${interaction.user.tag}: ${reason}`,
      );

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId: targetId,
          modId: interaction.user.id,
          action: "ban",
          reason,
          source: "manual",
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en ban:", err);
      }

      await HoshikoLogger.logAction(interaction.guild, "BAN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        caseId: caseNumber,
        source: "Comando",
        extra: deleteMessages
          ? "Mensajes de 7 días eliminados"
          : "Mensajes preservados",
      });

      const embed = new EmbedBuilder()
        .setTitle(`⛔ Usuario Baneado${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`Se ha baneado a **${targetTag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          { name: "📝 Razón", value: reason, inline: false },
          {
            name: "🗑️ Mensajes",
            value: deleteMessages ? "Eliminados (7 días)" : "Preservados",
            inline: true,
          },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xff0000)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • Usuario baneado del servidor` : "Usuario baneado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando ban:", error);
      await interaction.editReply({
        content: "🌸 Hubo un error al banear al usuario. Revisa mis permisos.",
      });
    }
  },
};

export default command;
