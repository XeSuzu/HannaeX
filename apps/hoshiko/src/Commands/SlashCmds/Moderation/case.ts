import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { getCaseById } from "../../../Database/moderation/case.model";
import { checkModeratorPermissions } from "../../../Utils/moderationGuards";
import ms from "ms";

const ACTION_LABELS: Record<string, { label: string; color: number; emoji: string }> = {
  warn: { label: "Advertencia", color: 0xffa500, emoji: "⚠️" },
  timeout: { label: "Silencio / Timeout", color: 0xffb6c1, emoji: "🔇" },
  kick: { label: "Expulsión", color: 0xff5500, emoji: "👢" },
  ban: { label: "Baneo", color: 0xff0000, emoji: "⛔" },
  unban: { label: "Desbaneo", color: 0x00ff7f, emoji: "✅" },
  purge: { label: "Purga de Mensajes", color: 0x3498db, emoji: "🧹" },
  unmute: { label: "Silencio Quitado", color: 0x00ff7f, emoji: "✨" },
};

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 3,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("Consulta los detalles de un caso de moderación por su número.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption((opt) =>
      opt
        .setName("numero")
        .setDescription("Número de caso a consultar.")
        .setRequired(true)
        .setMinValue(1),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    _client: HoshikoClient,
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

    const caseNumber = interaction.options.getInteger("numero", true);

    try {
      const caseDoc = await getCaseById(interaction.guild.id, caseNumber);

      if (!caseDoc) {
        await interaction.editReply({
          content: `🔍 No se encontró ningún caso con el número **#${caseNumber}** en este servidor.`,
        });
        return;
      }

      const actionMeta = ACTION_LABELS[caseDoc.action] ?? {
        label: caseDoc.action.toUpperCase(),
        color: 0x95a5a6,
        emoji: "📋",
      };

      const durationStr = caseDoc.durationMs
        ? ms(caseDoc.durationMs, { long: true })
        : null;

      const embed = new EmbedBuilder()
        .setTitle(`${actionMeta.emoji} Caso #${caseDoc.caseId} — ${actionMeta.label}`)
        .setColor(actionMeta.color)
        .addFields(
          { name: "👤 Usuario Objetivo", value: `<@${caseDoc.userId}> (\`${caseDoc.userId}\`)`, inline: true },
          { name: "👮 Moderador", value: `<@${caseDoc.modId}> (\`${caseDoc.modId}\`)`, inline: true },
          { name: "🏷️ Origen", value: `\`${caseDoc.source}\``, inline: true },
          { name: "📝 Razón", value: caseDoc.reason || "Sin razón especificada", inline: false },
          ...(durationStr ? [{ name: "⏱️ Duración", value: durationStr, inline: true }] : []),
          {
            name: "📅 Fecha",
            value: `<t:${Math.floor(new Date(caseDoc.createdAt).getTime() / 1000)}:F>`,
            inline: true,
          },
        )
        .setTimestamp(new Date(caseDoc.createdAt))
        .setFooter({ text: `Hoshiko Mod Audit • Caso #${caseDoc.caseId}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando /case:", error);
      await interaction.editReply({
        content: "🌸 Ocurrió un error al consultar el caso de moderación.",
      });
    }
  },
};

export default command;
