import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { ILevelConfig } from "../../../../Models/LevelConfig";

export async function handleView(
  interaction: ChatInputCommandInteraction,
  sub: string,
  config: ILevelConfig,
): Promise<unknown> {
  // ==================== VIEW ====================
  if (sub === "view") {
    const announceModeText = {
      all: "Todos los niveles",
      milestone: "Solo niveles importantes",
      silent: "Silencioso",
    }[config.announceMode || "milestone"];

    const systemStatus = config.enabled
      ? "🟢 **Activado**"
      : "🔴 **Desactivado**";
    const voiceStatus = config.xpVoiceEnabled
      ? "🟢 Activado"
      : "🔴 Desactivado";
    const dmStatus = config.announceDM ? "🟢 Activado" : "🔴 Desactivado";
    const botsStatus = config.ignoreBots ? "🟢 Ignorados" : "🔴 Contados";

    const embed = new EmbedBuilder()
      .setColor(config.enabled ? 0x51cf66 : 0xff6b6b)
      .setTitle("⚙️ Configuración de Niveles")
      .setDescription(
        `Estado del sistema: **${systemStatus}**\n` +
          (config.enabled
            ? "💡 Los usuarios están ganando XP activamente"
            : "⚠️ Usa `/setup-levels sistema toggle activo:true` para activar"),
      )
      .addFields(
        {
          name: "📢 Anuncios",
          value: announceModeText,
          inline: true,
        },
        {
          name: "📨 DM",
          value: dmStatus,
          inline: true,
        },
        {
          name: "💬 XP por mensaje",
          value:
            `\`${config.xpPerMessage}\` XP\n` +
            `cd: \`${config.xpCooldown}s\`\n` +
            `min: \`${config.xpMinLength}\` chars`,
          inline: true,
        },
        {
          name: "🎁 Bonus",
          value:
            `+${config.xpMentionBonus} XP/mención\n` +
            `max: ${config.xpMentionMaxBonus} XP\n` +
            `mult: x${config.xpMultiplier}`,
          inline: true,
        },
        {
          name: "🔊 XP por voz",
          value:
            voiceStatus +
            "\n" +
            (config.xpVoiceEnabled
              ? `\`${config.xpPerMinuteVoice}\` XP/min\nmin: \`${config.xpVoiceMinMinutes}\` min`
              : ""),
          inline: true,
        },
        {
          name: "🤖 Bots",
          value: botsStatus,
          inline: true,
        },
      );

    // Canal de anuncio
    if (config.announceChannelId) {
      embed.addFields({
        name: "📢 Canal de anuncio",
        value: `<#${config.announceChannelId}>`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📢 Canal de anuncio",
        value: "No configurado (se usará el canal actual de la acción).",
        inline: false,
      });
    }

    // Canales ignorados
    if (config.ignoredChannels.length > 0) {
      embed.addFields({
        name: "🚫 Canales ignorados",
        value: config.ignoredChannels.map((c) => `<#${c}>`).join(", "),
        inline: false,
      });
    }

    // Roles ignorados
    if (config.ignoredRoles.length > 0) {
      embed.addFields({
        name: "🚫 Roles ignorados",
        value: config.ignoredRoles.map((r) => `<@&${r}>`).join(", "),
        inline: false,
      });
    }

    // Roles por nivel
    const levelRolesCount = config.levelRoles.length;
    embed.addFields({
      name: "🎖️ Roles por nivel",
      value:
        levelRolesCount > 0
          ? `${levelRolesCount} rol(es) configurado(s)\nUsa \`/level-roles list\` para verlos`
          : "Ninguno configurado",
      inline: true,
    });

    embed.setFooter({ text: "Hoshiko Levels 🌸" }).setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}
}
