import { geniusProvider } from "./providers/geniusProvider";
import { lrclibProvider } from "./providers/lrclibProvider";
import { lyricsOvhProvider } from "./providers/lyricsOvhProvider";
import { LyricsResult, ParsedLyricsCommand } from "./types";

export async function findLyrics(
  query: ParsedLyricsCommand,
): Promise<LyricsResult> {
  const providers = [geniusProvider, lrclibProvider, lyricsOvhProvider];

  for (const provider of providers) {
    const result = await provider(query);
    if (result.found && result.lyrics) return result;
  }

  return {
    found: false,
    lyrics: null,
    source: null,
    title: query.song,
    artist: query.artist,
    thumbnail: null, // ← agregar esta línea
    confidence: 0,
  };
}
