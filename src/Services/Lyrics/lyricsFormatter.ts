import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { LyricsResult } from "./types";

const MAX_SECTIONS_PER_PAGE = 3;
const SECTION_REGEX = /^\[.+\]$/;
const SOURCE_LABELS: Record<string, string> = {
  genius: "Genius",
  lrclib: "LRCLIB",
  lyricsovh: "lyrics.ovh",
};

async function fetchItunesArtwork(
  title: string,
  artist: string | null,
): Promise<string | null> {
  try {
    const query = artist ? `${title} ${artist}` : title;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const artwork = data?.results?.[0]?.artworkUrl100;
    if (!artwork) return null;
    return artwork.replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}

export function splitLyricsBySection(lyrics: string): string[] {
  // Con etiquetas [Verse]/[Chorus] — cortar cada 3 secciones
  if (SECTION_REGEX.test(lyrics)) {
    const rawLines = lyrics.split("\n");
    const pages: string[] = [];
    let currentPage: string[] = [];
    let sectionsInPage = 0;

    for (const line of rawLines) {
      const trimmed = line.trim();

      if (SECTION_REGEX.test(trimmed)) {
        if (sectionsInPage >= MAX_SECTIONS_PER_PAGE && currentPage.length > 0) {
          pages.push(currentPage.join("\n").trim());
          currentPage = [];
          sectionsInPage = 0;
        }
        sectionsInPage++;
      }

      currentPage.push(trimmed);
    }

    if (currentPage.join("").trim()) {
      pages.push(currentPage.join("\n").trim());
    }

    return pages.filter((p) => p.trim().length > 0);
  }

  // Fallback — sin etiquetas, cortar por párrafos, 3 por página
  const paragraphs = lyrics
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const pages: string[] = [];
  for (let i = 0; i < paragraphs.length; i += MAX_SECTIONS_PER_PAGE) {
    pages.push(paragraphs.slice(i, i + MAX_SECTIONS_PER_PAGE).join("\n\n"));
  }

  return pages.length > 0 ? pages : [lyrics.trim()];
}

function sanitizeLyricsPage(text: string): string {
  return text
    .replace(/^[^[]*?(\d+\s*Contributors?[^\n]*\n?)/gi, "")
    .replace(/^(Embed|Read More|See .+ Live|You might also like).*/gim, "")
    .replace(/^[A-Z][^[\n].{60,}$/gm, "")
    .replace(/^[\s\-–—]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function buildLyricsPageEmbed(
  result: LyricsResult,
  pages: string[],
  page: number,
): Promise<EmbedBuilder> {
  const total = pages.length;
  const source = SOURCE_LABELS[result.source || ""] || result.source || "?";

  let thumbnail = result.thumbnail;
  if (!thumbnail && result.title) {
    thumbnail = await fetchItunesArtwork(result.title, result.artist);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`🎵 ${result.title || "Letra"}`)
    .setDescription(sanitizeLyricsPage(pages[page]) || "...")
    .setFooter({
      text: `Página ${page + 1}/${total} • ${source}`,
    });

  if (result.artist) {
    embed.setAuthor({ name: result.artist });
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  return embed;
}

export function buildLyricsButtons(
  page: number,
  total: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("lyrics_first")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("lyrics_prev")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("lyrics_next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === total - 1),
    new ButtonBuilder()
      .setCustomId("lyrics_last")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === total - 1),
    new ButtonBuilder()
      .setCustomId("lyrics_close")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
  );
}
