import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import ms, { StringValue } from "ms";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import { AutomodManager } from "../../../Features/AutomodManager";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { TempModerationService } from "../../../Services/TempModerationService";
import { createCase } from "../../../Database/moderation/case.model";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("tempmute")
    .setDescription("Silencia a un usuario por un tiempo determinado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a silenciar.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("tiempo")
        .setDescription("Duración (ej: 10m, 1h, 1d).")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("motivo")
        .setDescription("Razón del silencio.")
        .setRequired(false),
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
      await interaction.editReply({
        content: modPermCheck.reason!,
      });
      return;
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!botPermCheck.ok) {
      await interaction.editReply({
        content: botPermCheck.reason!,
      });
      return;
    }

    let rollbackFailed = false;

    const target = interaction.options.getMember("usuario");
    const timeInput = interaction.options.getString("tiempo", true);
    const reason =
      interaction.options.getString("motivo") || "No se especificó un motivo.";

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

    const duration = ms(timeInput as StringValue) as number;
    if (
      !duration ||
      typeof duration !== "number" ||
      duration < 5000 ||
      duration > 2419200000
    ) {
      await interaction.editReply({
        content:
          "❌ Tiempo no válido (ej: 10m, 1h) o fuera de rango (máximo 28 días).",
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;
      const unmuteDate = new Date(Date.now() + duration);
      const previousTimeoutUntil = target.communicationDisabledUntilTimestamp;

      await target.timeout(duration, reason);

      try {
        await TempModerationService.schedule({
          guildId: interaction.guild.id,
          userId: targetId,
          tipo: "mute",
          expiresAt: unmuteDate,
          moderatorId: interaction.user.id,
          reason,
          duration: timeInput,
        });
      } catch (scheduleError) {
        try {
          const previousTimeoutDuration =
            previousTimeoutUntil && previousTimeoutUntil > Date.now()
              ? previousTimeoutUntil - Date.now()
              : null;
          await target.timeout(
            previousTimeoutDuration,
            "Falló el registro del vencimiento del tempmute",
          );
        } catch (rollbackError) {
          rollbackFailed = true;
          console.error(
            "CRITICAL: No se pudo guardar ni revertir el tempmute",
            { scheduleError, rollbackError, guildId: interaction.guild.id, targetId },
          );
        }

        throw scheduleError;
      }

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "mute",
        `Tempmute por ${interaction.user.tag}: ${reason} (${timeInput})`,
      );

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId: targetId,
          modId: interaction.user.id,
          action: "timeout",
          reason,
          source: "manual",
          durationMs: duration,
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en tempmute:", err);
      }

      await HoshikoLogger.logAction(interaction.guild, "MUTE", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        duration: timeInput,
        expiresAt: unmuteDate,
        caseId: caseNumber,
        source: "Comando",
        actionLabel: `Silencio Temporal (${timeInput})`,
      });

      const embed = new EmbedBuilder()
        .setTitle(`⏳ Silencio Temporal${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`**${targetTag}** ha sido silenciado temporalmente.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          { name: "⏱️ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: false },
          {
            name: "🕐 Se desilencia",
            value: `<t:${Math.floor(unmuteDate.getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • El usuario será desilenciado automáticamente` : "El usuario será desilenciado automáticamente" });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("💥 Error en comando tempmute:", error);
      await interaction.editReply({
        content: rollbackFailed
          ? "❌ No se pudo registrar ni revertir el silencio temporal. El usuario sigue silenciado; contacta a un administrador."
          : "🌸 Hubo un error al silenciar al usuario. Revisa mis permisos.",
      });
    }
  },
};

export default command;
