import { LyricsResult, ParsedLyricsCommand } from "../types";

const LYRICS_OVH_BASE_URL =
  process.env.LYRICS_OVH_BASE_URL || "https://api.lyrics.ovh/v1";

export async function lyricsOvhProvider(
  query: ParsedLyricsCommand,
): Promise<LyricsResult> {
  try {
    if (!query.artist) {
      return {
        found: false,
        lyrics: null,
        source: "lyricsovh",
        title: query.song,
        artist: query.artist,
        confidence: 0,
        providerError: "lyrics.ovh requiere artista",
      };
    }

    const url = `${LYRICS_OVH_BASE_URL}/${encodeURIComponent(query.artist)}/${encodeURIComponent(query.song)}`;
    const res = await fetch(url);

    if (!res.ok) {
      return {
        found: false,
        lyrics: null,
        source: "lyricsovh",
        title: query.song,
        artist: query.artist,
        confidence: 0,
      };
    }

    const data = await res.json();
    const lyrics = data?.lyrics?.trim() || null;

    if (!lyrics) {
      return {
        found: false,
        lyrics: null,
        source: "lyricsovh",
        title: query.song,
        artist: query.artist,
        confidence: 0,
      };
    }

    return {
      found: true,
      lyrics,
      source: "lyricsovh",
      title: query.song,
      artist: query.artist,
      confidence: 0.65,
    };
  } catch (error: any) {
    return {
      found: false,
      lyrics: null,
      source: "lyricsovh",
      title: query.song,
      artist: query.artist,
      confidence: 0,
      providerError: error?.message || "Error en lyrics.ovh",
    };
  }
}
