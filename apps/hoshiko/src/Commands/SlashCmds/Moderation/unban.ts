import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import {
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import TempModeration from "../../../Database/moderation/tempModeration.model";
import { createCase } from "../../../Database/moderation/case.model";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Desbanea a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("ID del usuario a desbanear.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("razon")
        .setDescription("Razón del desban.")
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

    const userInput = interaction.options.getString("usuario", true);
    const reason =
      interaction.options.getString("razon") || "No se especificó un motivo.";

    let userId = userInput.trim();

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.editReply({
        content: "❌ Proporciona una ID de usuario válida.",
      });
      return;
    }

    try {
      let ban;
      try {
        ban = await interaction.guild.bans.fetch(userId);
      } catch {
        ban = null;
      }

      if (!ban) {
        await interaction.editReply({
          content: "❌ Ese usuario no está baneado.",
        });
        return;
      }

      const userTag = ban.user.tag;
      const user = ban.user;

      HoshikoLogger.markBotModerationAction(interaction.guild.id, "UNBAN", userId);

      await interaction.guild.bans.remove(
        userId,
        `${interaction.user.tag}: ${reason}`,
      );

      await TempModeration.deleteOne({
        guildId: interaction.guild.id,
        userId,
        tipo: "ban",
      }).catch((err) => {
        console.error("Error al limpiar TempModeration en unban:", err);
      });

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId,
          modId: interaction.user.id,
          action: "unban",
          reason,
          source: "manual",
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en unban:", err);
      }

      await HoshikoLogger.logAction(interaction.guild, "UNBAN", {
        user: user,
        moderator: interaction.user,
        reason: reason,
        caseId: caseNumber,
        source: "Comando",
      });

      const embed = new EmbedBuilder()
        .setTitle(`✅ Usuario Desbaneado${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`**${userTag}** ha sido desbaneado.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${userId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          { name: "📝 Razón", value: reason, inline: false },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${userId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0x00ff7f)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • Usuario desbaneado del servidor` : "Usuario desbaneado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando unban:", error);
      await interaction.editReply({
        content: "🌸 Hubo un error al desbanear. Revisa mis permisos.",
      });
    }
  },
};

export default command;
