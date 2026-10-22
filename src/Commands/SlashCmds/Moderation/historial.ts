import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCasesByUser } from "../../../Database/moderation/case.model";
import { summarizeUserHistoryWithAi } from "../../../Features/automod/aiHistorySummarizer";
import { isAiFeatureAllowed } from "../../../Features/automod/aiFeatureGating";

export default {
  options: {
    ephemeral: true,
  },
  data: new SlashCommandBuilder()
    .setName("historial")
    .setDescription("Genera un resumen asistido por IA del historial disciplinario de un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Miembro a consultar")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;
    const target = interaction.options.getUser("usuario", true);

    const gate = await isAiFeatureAllowed(guildId, "ai_history_summary");
    if (!gate.allowed) {
      await interaction.editReply({
        content: gate.reason || "Esta función no está disponible en este servidor.",
      });
      return;
    }

    const cases = await getCasesByUser(guildId, target.id, 20);

    if (cases.length === 0) {
      const cleanEmbed = new EmbedBuilder()
        .setTitle(`📜 Historial de ${target.tag}`)
        .setColor(0x57f287)
        .setDescription(
          `🌸 **<@${target.id}> no tiene ningún caso disciplinario registrado.**\n\nSu historial en este servidor se encuentra limpio.`,
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [cleanEmbed] });
      return;
    }

    const analysis = await summarizeUserHistoryWithAi({
      userId: target.id,
      userTag: target.tag,
      cases,
    });

    const riskColor =
      analysis.recidivismRisk === "crítico" || analysis.recidivismRisk === "alto"
        ? 0xed4245
        : analysis.recidivismRisk === "medio"
          ? 0xfaa61a
          : 0x57f287;

    const embed = new EmbedBuilder()
      .setTitle(`📜 Resumen Disciplinario Asistido por IA: ${target.tag}`)
      .setColor(riskColor)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(
        `**Diagnóstico Ejecutivo:**\n${analysis.summary}\n\n` +
          `**Riesgo de Reincidencia:** \`${analysis.recidivismRisk.toUpperCase()}\`\n` +
          `**Casos Registrados:** \`${cases.length} caso(s)\`\n` +
          `**Pauta Disciplinaria Sugerida:**\n> ${analysis.recommendedNextStep}\n\n` +
          `*(Usa \`/cases usuario:@${target.username}\` para ver el desglose individual).*`,
      )
      .setFooter({
        text: "Hoshiko Security Intelligence • Resumen asistido",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
