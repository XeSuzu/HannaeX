import {
  AutoModerationActionExecution,
  EmbedBuilder,
  Events,
  TextChannel,
} from "discord.js";
import type { HoshikoClient } from "../../client/HoshikoClient";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { addWarning } from "../../Database/moderation/warning.model";
import { HoshikoLogger, LogLevel } from "../../Security";

export default {
  name: Events.AutoModerationActionExecution,
  async execute(execution: AutoModerationActionExecution, client: HoshikoClient) {
    try {
      const { guild, userId, channelId, content, matchedKeyword, matchedContent, ruleId } = execution;
      if (!guild) return;

      const user = await client.users.fetch(userId).catch(() => null);
      const channel = channelId ? guild.channels.cache.get(channelId) : null;
      const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
      const ruleName = rule?.name || "AutoMod Rule";

      const reason = `[AutoMod Nativo] ${ruleName}${matchedKeyword ? ` (Coincidencia: ${matchedKeyword})` : ""}`;

      // Persistir advertencia en MongoDB
      if (client.user) {
        await addWarning(
          guild.id,
          userId,
          client.user.id,
          reason,
          "warn",
          "system",
        ).catch(() => null);
      }

      // Registro en sistema de logs interno
      void HoshikoLogger.log({
        level: LogLevel.WARN,
        context: "AutoMod/Execution",
        message: `Infracción AutoMod por ${user?.tag || userId} en ${guild.name}: ${ruleName}`,
        guildId: guild.id,
        metadata: {
          userId,
          channelId,
          ruleName,
          matchedKeyword,
          matchedContent,
        },
      });

      // Enviar log al canal de moderación del servidor si está configurado
      const config = await SettingsManager.getSettings(guild.id).catch(() => null);
      if (!config) return;

      const logChannelId =
        config.logChannels?.modlog ||
        config.logChannels?.linkslog ||
        config.modLogChannel;

      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xfa5252)
            .setAuthor({
              name: `🛡️ AutoMod | Mensaje Bloqueado`,
              iconURL: user?.displayAvatarURL() || undefined,
            })
            .setDescription(`Se ha bloqueado un mensaje automáticamente mediante reglas nativas de Discord.`)
            .addFields(
              {
                name: "👤 Usuario",
                value: user ? `${user} (\`${user.id}\`)` : `\`${userId}\``,
                inline: true,
              },
              {
                name: "📍 Canal",
                value: channel ? `${channel}` : `\`${channelId}\``,
                inline: true,
              },
              {
                name: "📜 Regla activada",
                value: `**${ruleName}**`,
                inline: false,
              },
            )
            .setTimestamp();

          if (matchedKeyword) {
            embed.addFields({
              name: "🔍 Coincidencia detectada",
              value: `\`${matchedKeyword}\``,
              inline: true,
            });
          }

          if (content) {
            const preview = content.length > 500 ? `${content.slice(0, 497)}...` : content;
            embed.addFields({
              name: "💬 Contenido del mensaje",
              value: `\`\`\`${preview}\`\`\``,
              inline: false,
            });
          }

          await logChannel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    } catch (err: any) {
      void HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "AutoMod/ExecutionError",
        message: `Error procesando evento AutoModerationActionExecution: ${err?.message || String(err)}`,
      });
    }
  },
};
