import { Events, Channel, DMChannel, GuildChannel } from "discord.js";
import { HoshikoClient } from "../../../index";
import ServerConfig from "../../../Models/serverConfig";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.ChannelDelete,
  async execute(channel: DMChannel | GuildChannel, client: HoshikoClient) {
    // Ignoramos DMs
    if (channel.isDMBased()) return;

    try {
      const guildId = channel.guild.id;
      const settings = await ServerConfig.findOne({ guildId });

      if (!settings || !settings.confessions || !settings.confessions.feeds)
        return;

      // 1. Verificar si el canal borrado era un Feed configurado
      const feedIndex = settings.confessions.feeds.findIndex(
        (f) => f.channelId === channel.id,
      );

      // 2. Si era un Feed, lo eliminamos de la DB y liberamos el slot
      if (feedIndex !== -1) {
        const deletedFeed = settings.confessions.feeds[feedIndex];

        // Eliminamos del array
        settings.confessions.feeds.splice(feedIndex, 1);

        // Si era el canal principal (default), lo desvinculamos también
        if (settings.confessions.channelId === channel.id) {
          settings.confessions.channelId = null;
          settings.confessions.enabled = false; // Desactivamos por seguridad
        }

        settings.markModified("confessions");
        await settings.save();

        // 3. Log (Opcional)
        HoshikoLogger.log({
          level: LogLevel.INFO,
          context: "System/Cleanup",
          message: `Canal Feed "${deletedFeed.title}" eliminado en ${channel.guild.name}. Slot liberado.`,
        });
      }
    } catch (error) {
      console.error("Error en Auto-Cleanup de canales:", error);
    }
  },
};
