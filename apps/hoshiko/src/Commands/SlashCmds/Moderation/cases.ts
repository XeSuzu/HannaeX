import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import {
  getCasesByUser,
  getRecentCases,
  ICase,
} from "../../../Database/moderation/case.model";
import { checkModeratorPermissions } from "../../../Utils/moderationGuards";

const ACTION_ICONS: Record<string, string> = {
  warn: "⚠️",
  timeout: "🔇",
  kick: "👢",
  ban: "⛔",
  unban: "✅",
  purge: "🧹",
  unmute: "✨",
};

function formatCaseLine(c: ICase): string {
  const icon = ACTION_ICONS[c.action] ?? "📋";
  const date = new Date(c.createdAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
  return `\`#${c.caseId}\` ${icon} **${c.action.toUpperCase()}** | <@${c.userId}> | Mod: <@${c.modId}> — *${c.reason.slice(0, 50)}${c.reason.length > 50 ? "..." : ""}* (${date})`;
}

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("cases")
    .setDescription("Lista los casos de moderación recientes del servidor o de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario para filtrar sus casos.")
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("limite")
        .setDescription("Cantidad máxima de casos a mostrar (1 - 25). Por defecto: 10.")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25),
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

    const targetUser = interaction.options.getUser("usuario");
    const limit = interaction.options.getInteger("limite") ?? 10;

    try {
      let cases: ICase[];
      let title: string;
      let descriptionHeader: string;

      if (targetUser) {
        cases = await getCasesByUser(interaction.guild.id, targetUser.id, limit);
        title = `📋 Casos de Moderación — ${targetUser.tag}`;
        descriptionHeader = `Mostrando los últimos **${cases.length}** casos de <@${targetUser.id}>:`;
      } else {
        cases = await getRecentCases(interaction.guild.id, limit);
        title = `📋 Historial de Casos Recientes — ${interaction.guild.name}`;
        descriptionHeader = `Mostrando los últimos **${cases.length}** casos del servidor:`;
      }

      if (cases.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(
            targetUser
              ? `✨ No hay casos de moderación registrados para <@${targetUser.id}>.`
              : "✨ No hay casos de moderación registrados en este servidor.",
          )
          .setColor(0x00ff7f)
          .setTimestamp();

        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      const MAX_DESC_LENGTH = 4000;
      const formattedLines: string[] = [];
      let omittedCount = 0;

      for (let i = 0; i < cases.length; i++) {
        const line = formatCaseLine(cases[i]);
        const testLines = [...formattedLines, line];
        const remaining = cases.length - testLines.length;
        const testSuffix = remaining > 0 ? `\n\n*... y ${remaining} casos más*` : "";
        const testDesc = `${descriptionHeader}\n\n${testLines.join("\n")}${testSuffix}`;

        if (testDesc.length > MAX_DESC_LENGTH) {
          omittedCount = cases.length - formattedLines.length;
          break;
        }

        formattedLines.push(line);
      }

      let description = `${descriptionHeader}\n\n${formattedLines.join("\n")}`;
      if (omittedCount > 0) {
        description += `\n\n*... y ${omittedCount} casos más*`;
      }

      if (description.length > MAX_DESC_LENGTH) {
        description = description.slice(0, MAX_DESC_LENGTH - 3) + "...";
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x3498db)
        .setTimestamp()
        .setFooter({
          text: `Total consultados: ${cases.length} (Límite: ${limit})`,
        });

      if (targetUser) {
        embed.setThumbnail(targetUser.displayAvatarURL());
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando /cases:", error);
      await interaction.editReply({
        content: "🌸 Ocurrió un error al consultar el historial de casos.",
      });
    }
  },
};

export default command;
