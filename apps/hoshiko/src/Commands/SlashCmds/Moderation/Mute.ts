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
import ms, { StringValue } from "ms";
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
    .setName("mute")
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
      await target.timeout(duration, reason);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "mute",
        `Mute manual por ${interaction.user.tag}: ${reason}`,
      );

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId: target.id,
          modId: interaction.user.id,
          action: "timeout",
          reason,
          source: "manual",
          durationMs: duration,
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en mute:", err);
      }

      await HoshikoLogger.logAction(interaction.guild, "MUTE", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        duration: timeInput,
        caseId: caseNumber,
        source: "Comando",
        expiresAt: Date.now() + duration,
        extra: `Duración solicitada: ${timeInput}`,
      });

      const embed = new EmbedBuilder()
        .setTitle(`🔇 Usuario Silenciado${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`Se ha aplicado un silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "⏳ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          {
            name: "🆔 IDs",
            value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • Acción registrada en el historial` : "Acción registrada en el historial" });

      await interaction.editReply({
        content: "✅ Silencio aplicado con éxito.",
        embeds: [embed],
      });
    } catch (error) {
      console.error("💥 Error en comando mute:", error);
      await interaction.editReply({
        content:
          "🌸 Hubo un error al silenciar al usuario. Revisa mis permisos.",
      });
    }
  },
};

export default command;
