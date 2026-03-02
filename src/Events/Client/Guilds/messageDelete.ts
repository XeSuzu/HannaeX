import { Events, Message, PartialMessage, EmbedBuilder, Collection } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export interface SnipeData {
  content: string;
  author: string;
  authorAvatar: string;
  image: string | null;
  timestamp: number;
}

export const snipes = new Collection<string, SnipeData[]>();

export default {
  name: Events.MessageDelete,
  async execute(
    message: Message | PartialMessage,
    client: any
  ): Promise<void> {
    if (message.author?.bot) return;
    if (!message.guild) return;

    // ─── 1. SNIPE ────────────────────────────────────────────────────────────
    if (message.author && message.content !== undefined) {
      const currentSnipes = snipes.get(message.channel.id) || [];
      currentSnipes.unshift({
        content: message.content || "*(Solo imagen/sticker)*",
        author: message.author.tag,
        authorAvatar: message.author.displayAvatarURL(),
        image: (message as Message).attachments?.first()?.proxyURL || null,
        timestamp: Date.now(),
      });
      if (currentSnipes.length > 10) currentSnipes.pop();
      snipes.set(message.channel.id, currentSnipes);
    }

    // ─── 2. MESSAGE LOG ──────────────────────────────────────────────────────
    const content = message.content ?? "[no disponible — no estaba en caché]";
    const user = message.author;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Mensaje Eliminado")
      .setColor(0xff6b6b)
      .addFields(
        { name: "Contenido", value: content.slice(0, 1024) || "[vacío]" },
        { name: "Canal", value: `<#${message.channelId}>`, inline: true },
        {
          name: "Usuario",
          value: user ? `${user.tag} \`(${user.id})\`` : "[desconocido — mensaje parcial]",
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(message.guild, "messagelog", embed);
  },
};
