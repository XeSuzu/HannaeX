import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { LyricsResult } from "./types";

const PAGE_SIZE = 3800;

export function splitLyrics(lyrics: string): string[] {
  const pages: string[] = [];
  const lines = lyrics.split("\n");
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).trim().length > PAGE_SIZE) {
      if (current.trim()) pages.push(current.trim());
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }

  if (current.trim()) pages.push(current.trim());
  return pages.length > 0 ? pages : ["..."];
}

const SOURCE_LABELS: Record<string, string> = {
  genius: "Genius",
  lrclib: "LRCLIB",
  lyricsovh: "lyrics.ovh",
};

export function buildLyricsPageEmbed(
  result: LyricsResult,
  pages: string[],
  page: number,
): EmbedBuilder {
  const title = (result.title || "LETRA").toUpperCase();
  const artist = result.artist ? ` — ${result.artist}` : "";
  const source =
    SOURCE_LABELS[result.source || ""] || result.source || "desconocida";
  const total = pages.length;

  const buildProgress = (index: number, total: number) => {
    if (total <= 1) return "";
    const filled = Math.round((index / (total - 1)) * 8);
    return " • " + "▰".repeat(filled) + "▱".repeat(8 - filled);
  };

  return new EmbedBuilder()
    .setColor(0xffff00)
    .setAuthor({ name: `🎵 ${title}${artist}` })
    .setDescription(pages[page])
    .setFooter({
      text: `Página ${page + 1} de ${total}${buildProgress(page, total)} • ${source}`,
    });
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
