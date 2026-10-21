import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCasesByUser } from "../../../Database/moderation/case.model";
import { SlashCommand } from "../../../Interfaces/Command";

const ACTION_EMOJIS: Record<string, string> = {
  warn: "⚠️",
  timeout: "🔇",
  kick: "👢",
  ban: "🔨",
  unban: "🔓",
  purge: "🧹",
};

const command: SlashCommand = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("cases")
    .setDescription("📂 Consulta el historial de casos disciplinarios de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a inspeccionar.").setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("usuario", true);
    const cases = await getCasesByUser(interaction.guild.id, target.id, 10);

    if (cases.length === 0) {
      await interaction.reply({
        content: `✅ <@${target.id}> no tiene casos disciplinarios registrados en este servidor.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📂 Historial Disciplinario: ${target.tag}`)
      .setDescription(`Mostrando los últimos **${cases.length}** casos registrados.`)
      .setColor(0xfaa61a)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    for (const c of cases) {
      const emoji = ACTION_EMOJIS[c.action] || "⚖️";
      const mod = c.modId === "auto" ? "🤖 *Automod*" : `<@${c.modId}>`;
      const rule = c.ruleId ? ` | Regla: #${c.ruleId}` : "";
      const date = `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>`;

      embed.addFields({
        name: `${emoji} Caso #${c.caseId} — ${c.action.toUpperCase()} (${c.source})`,
        value: `**Motivo:** ${c.reason}\n**Responsable:** ${mod}${rule}\n**Fecha:** ${date}`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
