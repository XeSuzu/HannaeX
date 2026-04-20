import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { LyricsResult } from "./types";

const MAX_LINES_PER_PAGE = 12;
const SECTION_REGEX = /^\[.+\]$/;
const SOURCE_LABELS: Record<string, string> = {
  genius: "Genius",
  lrclib: "LRCLIB",
  lyricsovh: "lyrics.ovh",
};

// Busca artwork en iTunes si no viene del proveedor
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
    // Subir resolución de 100x100 a 600x600
    return artwork.replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}

// Divide la letra en páginas por sección, máx 12 líneas por página
export function splitLyricsBySection(lyrics: string): string[] {
  const rawLines = lyrics.split("\n");
  const pages: string[] = [];
  let currentPage: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();

    // Nueva sección detectada
    if (SECTION_REGEX.test(trimmed) && currentPage.length > 0) {
      pages.push(currentPage.join("\n").trim());
      currentPage = [trimmed];
      continue;
    }

    currentPage.push(trimmed);

    // Si ya llegó al límite de líneas, cortar
    if (currentPage.filter((l) => l !== "").length >= MAX_LINES_PER_PAGE) {
      pages.push(currentPage.join("\n").trim());
      currentPage = [];
    }
  }

  if (currentPage.join("").trim()) {
    pages.push(currentPage.join("\n").trim());
  }

  return pages.filter((p) => p.trim().length > 0);
}

// Sanear texto — quita info extra que viene en Genius al inicio
function sanitizeLyricsPage(text: string): string {
  return text
    .replace(/\d+ Contributors?.*?Lyrics/is, "")
    .replace(/^(Embed|See \w+ Live).*$/gim, "")
    .replace(/You might also like/gi, "")
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

  // Imagen: primero del proveedor, si no busca en iTunes
  let thumbnail = result.thumbnail;
  if (!thumbnail && result.title) {
    thumbnail = await fetchItunesArtwork(result.title, result.artist);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`🎵 ${result.title || "Letra"}`)
    .setDescription(sanitizeLyricsPage(pages[page]))
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
