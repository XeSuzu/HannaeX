import type { Message } from "discord.js";
import {
  buildLyricsButtons, buildLyricsPageEmbed, findLyrics, normalizeLyricsQuery,
  splitLyricsBySection,
} from "../../Services/Lyrics";
import type { ParsedLyricsCommand } from "../../Services/Lyrics/types";

export async function handleLyricsResponse(message: Message, parsedLyrics: ParsedLyricsCommand): Promise<void> {
  const waiting = await message.reply("🎶 Buscando...");
  const normalizedQuery = normalizeLyricsQuery(parsedLyrics);
  const result = await findLyrics(normalizedQuery);
  if (!result.found || !result.lyrics) {
    await waiting.edit("😿 No encontré la letra de esa canción~");
    return;
  }
  const pages = splitLyricsBySection(result.lyrics);
  let page = 0;
  const total = pages.length;
  const firstEmbed = await buildLyricsPageEmbed(result, pages, page);
  await waiting.edit({ content: null, embeds: [firstEmbed], components: total > 1 ? [buildLyricsButtons(page, total)] : [] });
  if (total <= 1) return;
  const collector = waiting.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 180_000 });
  collector.on("collect", async (i) => {
    await i.deferUpdate();
    if (i.customId === "lyrics_close") { collector.stop(); return; }
    if (i.customId === "lyrics_first") page = 0;
    else if (i.customId === "lyrics_prev") page = Math.max(0, page - 1);
    else if (i.customId === "lyrics_next") page = Math.min(total - 1, page + 1);
    else if (i.customId === "lyrics_last") page = total - 1;
    const updatedEmbed = await buildLyricsPageEmbed(result, pages, page);
    await waiting.edit({ embeds: [updatedEmbed], components: [buildLyricsButtons(page, total)] });
  });
  collector.on("end", async () => { await waiting.edit({ components: [] }).catch(() => {}); });
}
