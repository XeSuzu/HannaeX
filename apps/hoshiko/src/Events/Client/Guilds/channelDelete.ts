import { AuditLogEvent, DMChannel, EmbedBuilder, Events, GuildChannel } from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import ServerConfig from "../../../Database/guild/serverConfig.model";
import { CacheManager } from "../../../Database/guild/CacheManager";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.ChannelDelete,
  async execute(channel: DMChannel | GuildChannel, client: HoshikoClient) {
    if (channel.isDMBased()) return;

    try {
      const guildId = channel.guild.id;
      const settings = await ServerConfig.findOne({ guildId });

      if (settings?.confessions?.feeds) {
        const feedIndex = settings.confessions.feeds.findIndex(
          (f) => f.channelId === channel.id,
        );

        if (feedIndex !== -1) {
          const deletedFeed = settings.confessions.feeds[feedIndex];
          settings.confessions.feeds.splice(feedIndex, 1);

          if (settings.confessions.channelId === channel.id) {
            settings.confessions.channelId = null;
            settings.confessions.enabled = false;
          }

          settings.markModified("confessions");
          await settings.save();
          CacheManager.flush(guildId);

          HoshikoLogger.log({
            level: LogLevel.INFO,
            context: "System/Cleanup",
            message: `Canal Feed "${deletedFeed.title}" eliminado en ${channel.guild.name}. Slot liberado.`,
          });
        }
      }

      // Log al serverlog
      const executor = await HoshikoLogger.fetchAuditExecutor(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id,
      );

      const embed = new EmbedBuilder()
        .setTitle("🗑️ Canal eliminado")
        .setColor(0xed4245)
        .addFields(
          { name: "Nombre", value: `\`${channel.name}\``, inline: true },
          { name: "Tipo", value: channel.type.toString(), inline: true },
          {
            name: "Categoría",
            value: channel.parent?.name ?? "Sin categoría",
            inline: true,
          },
          {
            name: "Responsable",
            value: executor
              ? `<@${executor.id}> (\`${executor.tag}\`)`
              : "Actor no disponible",
            inline: true,
          },
          { name: "ID", value: `\`${channel.id}\``, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: "Hoshiko Logs" });

      await HoshikoLogger.sendToChannel(channel.guild, "serverlog", embed);
    } catch (error) {
      console.error("Error en Auto-Cleanup de canales:", error);
    }
  },
};
