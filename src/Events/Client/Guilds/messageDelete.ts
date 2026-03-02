// src/Events/Client/Guilds/messageDelete.ts
import { Events, Message, PartialMessage, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { Snipe } from "../../../Models/snipe";

export default {
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage, client: any): Promise<void> {
    if (message.author?.bot) return;
    if (!message.guild) return;

    // ─── 1. SNIPE (persistido en MongoDB con TTL de 1h) ──────────────────────
    if (message.author && message.content !== undefined) {
      const snipeEntry = {
        content:      message.content || "*(Solo imagen/sticker)*",
        author:       message.author.tag,
        authorId:     message.author.id,
        authorAvatar: message.author.displayAvatarURL(),
        image:        (message as Message).attachments?.first()?.proxyURL || null,
        deletedAt:    new Date(),
      };

      await Snipe.findOneAndUpdate(
        { channelId: message.channel.id },
        {
          $set:  { guildId: message.guild.id },
          // Inserta al inicio, máximo 10 entradas
          $push: {
            snipes: {
              $each:     [snipeEntry],
              $position: 0,
              $slice:    10,
            },
          },
        },
        { upsert: true }
      );
    }

    // ─── 2. MESSAGE LOG ───────────────────────────────────────────────────────
    const content = message.content ?? "[no disponible — no estaba en caché]";
    const user    = message.author;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Mensaje Eliminado")
      .setColor(0xff6b6b)
      .addFields(
        { name: "Contenido", value: content.slice(0, 1024) || "[vacío]" },
        { name: "Canal",     value: `<#${message.channelId}>`,                                          inline: true },
        { name: "Usuario",   value: user ? `${user.tag} \`(${user.id})\`` : "[desconocido]", inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(message.guild, "messagelog", embed);
  },
};