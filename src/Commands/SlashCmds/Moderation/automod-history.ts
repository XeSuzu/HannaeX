import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  User,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { AutomodManager } from "../../../Features/AutomodManager";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";

/**
 * Obtiene emoji basado en el tipo de acción
 */
function getActionEmoji(action: string): string {
  switch (action) {
    case "warn":
      return "⚠️";
    case "mute":
      return "🔇";
    case "kick":
      return "👢";
    case "ban":
      return "🔨";
    default:
      return "❓";
  }
}

/**
 * Convierte timestamp a formato "hace X minutos/horas/días"
 */
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? "s" : ""}`;
  if (days < 30) return `hace ${days} día${days > 1 ? "s" : ""}`;

  return new Date(timestamp).toLocaleDateString("es-ES");
}

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 10, // 10 segundos entre búsquedas de historial
  data: new SlashCommandBuilder()
    .setName("automod-history")
    .setDescription("Ver el historial de acciones de automod para un usuario")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Historial del usuario")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("limite")
        .setDescription("Registros a mostrar (máximo 25)")
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) return;

    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    try {
      const target = interaction.options.getUser("usuario") as User;
      const limit = interaction.options.getNumber("limite") || 10;

      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario.");
        return;
      }

      // Obtener historial de acciones
      const history = await AutomodManager.getActionHistory(
        interaction.guild.id,
        target.id,
        limit
      );

      if (history.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle("📋 Historial de Automod")
          .setDescription(`No hay acciones registradas para **${target.tag}**`)
          .setColor(0x00aa00)
          .setThumbnail(target.displayAvatarURL())
          .setFooter({ text: `Guild: ${interaction.guild.name}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Crear embed con historial
      const embed = new EmbedBuilder()
        .setTitle("📋 Historial de Automod")
        .setDescription(`Últimas acciones para **${target.tag}** (${history.length} registros)`)
        .setColor(0xff9800)
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: `Guild: ${interaction.guild.name}` })
        .setTimestamp();

      // Agregar cada acción como un field
      for (const entry of history) {
        const timeAgo = getTimeAgo(entry.timestamp);
        const actionEmoji = getActionEmoji(entry.action);
        const statusEmoji = entry.success ? "✅" : "❌";

        const fieldValue =
          `**Motivo:** ${entry.reason}\n` +
          `**Estado:** ${statusEmoji} ${entry.success ? "Ejecutada" : "Bloqueada"}\n` +
          `**Tiempo:** ${timeAgo}`;

        embed.addFields({
          name: `${actionEmoji} ${entry.action.toUpperCase()}`,
          value: fieldValue,
          inline: false
        });
      }

      // Limitar a 25 fields (límite de Discord)
      if (embed.data.fields && embed.data.fields.length > 25) {
        embed.data.fields = embed.data.fields.slice(0, 25);
        embed.setDescription(
          `Últimas acciones para **${target.tag}** (mostrando 25 de ${history.length})`
        );
      }

      await interaction.editReply({ embeds: [embed] });

      // Log de auditoría (mod viendo el historial)
      await Logger.logAnomalyDetected(
        "AutomodHistoryAccess",
        `${interaction.user.tag} viewed history for ${target.tag}`,
        interaction.guild.name
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Logger.logCriticalError(
        "AutomodHistoryCommand",
        errorMsg,
        error instanceof Error ? error.stack : undefined
      );

      await interaction.editReply(
        "❌ Hubo un error al obtener el historial. Intenta de nuevo más tarde."
      );
    }
  },
};

export default command;
