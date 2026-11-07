import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import type { HoshikoClient } from "../../client/HoshikoClient";
import { SearchService, isQuerySafe } from "../../Services/search";

export async function handleImageSearch(message: Message, client: HoshikoClient, query: string): Promise<void> {
  const isNsfwChannel = message.channel instanceof TextChannel && (message.channel as TextChannel).nsfw;
  if (!isNsfwChannel && !isQuerySafe(query)) {
    await message.reply("Hmm~ esa búsqueda no puedo hacerla aquí. Probá con algo más general o prueba en un canal NSFW si lo necesitas~");
    return;
  }
  const waitingMsg = await message.reply(`🔍 Dejame buscar **${query}**... un seg~`);
  try {
    const results = await SearchService.searchImages(query, 10, !isNsfwChannel);
    if (!results || results.length === 0) {
      await waitingMsg.edit(`Hmm~ no encontré nada para **${query}**. Probá con otras palabras clave~`);
      return;
    }
    let page = 0;
    const total = results.length;
    const buildProgress = (index: number, total: number) => {
      const filled = Math.round((index / (total - 1)) * 8);
      return "▰".repeat(filled) + "▱".repeat(8 - filled);
    };
    const buildEmbed = (index: number) => {
      const img = results[index];
      const progress = buildProgress(index, total);
      return new EmbedBuilder().setColor(0xff8fab).setAuthor({ name: `🔍 ${query}`, iconURL: client.user?.displayAvatarURL() })
        .setTitle(img.title?.substring(0, 256) || query).setURL(img.link).setImage(img.imageUrl)
        .addFields(
          { name: "🌐 Fuente", value: `[${img.source}](${img.link})`, inline: true },
          { name: "🖼️ Resultado", value: `\`${index + 1} de ${total}\``, inline: true },
        ).setFooter({ text: `${progress} • pedida por ${message.author.username}`, iconURL: message.author.displayAvatarURL() });
    };
    const buildButtons = (index: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("img_first").setEmoji("⏮️").setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
      new ButtonBuilder().setCustomId("img_prev").setEmoji("◀️").setStyle(ButtonStyle.Primary).setDisabled(index === 0),
      new ButtonBuilder().setCustomId("img_next").setEmoji("▶️").setStyle(ButtonStyle.Primary).setDisabled(index === total - 1),
      new ButtonBuilder().setCustomId("img_last").setEmoji("⏭️").setStyle(ButtonStyle.Secondary).setDisabled(index === total - 1),
      new ButtonBuilder().setCustomId("img_close").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
    );
    await waitingMsg.edit({ content: null, embeds: [buildEmbed(page)], components: [buildButtons(page)] });
    const collector = waitingMsg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 120_000 });
    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.customId === "img_close") { collector.stop(); return; }
      if (i.customId === "img_first") page = 0;
      else if (i.customId === "img_prev") page = Math.max(0, page - 1);
      else if (i.customId === "img_next") page = Math.min(total - 1, page + 1);
      else if (i.customId === "img_last") page = total - 1;
      await waitingMsg.edit({ embeds: [buildEmbed(page)], components: [buildButtons(page)] });
    });
    collector.on("end", async () => { await waitingMsg.edit({ components: [] }).catch(() => {}); });
  } catch (error) {
    console.error("[aiHandler Img] Error:", error);
    await waitingMsg.edit("Ups~ algo salió mal buscando imágenes. Podés intentar de nuevo?");
  }
}
