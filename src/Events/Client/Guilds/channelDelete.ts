import { DMChannel, EmbedBuilder, Events, GuildChannel } from "discord.js";
import { HoshikoClient } from "../../../index";
import ServerConfig from "../../../Models/serverConfig";
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

          HoshikoLogger.log({
            level: LogLevel.INFO,
            context: "System/Cleanup",
            message: `Canal Feed "${deletedFeed.title}" eliminado en ${channel.guild.name}. Slot liberado.`,
          });
        }
      }

      // Log al serverlog
      const embed = new EmbedBuilder()
        .setTitle("🗑️ Canal Eliminado")
        .setColor(0xff6b6b)
        .addFields(
          { name: "Nombre", value: channel.name, inline: true },
          { name: "Tipo", value: channel.type.toString(), inline: true },
          {
            name: "Categoría",
            value: channel.parent?.name ?? "Sin categoría",
            inline: true,
          },
          { name: "ID", value: `\`${channel.id}\``, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: "Hoshiko • Server Log" });

      await HoshikoLogger.sendToChannel(channel.guild, "serverlog", embed);
    } catch (error) {
      console.error("Error en Auto-Cleanup de canales:", error);
    }
  },
};
