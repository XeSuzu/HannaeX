import { LyricsResult, ParsedLyricsCommand } from "../types";

const LRCLIB_BASE_URL = process.env.LRCLIB_BASE_URL || "https://lrclib.net/api";

export async function lrclibProvider(
  query: ParsedLyricsCommand,
): Promise<LyricsResult> {
  try {
    const params = new URLSearchParams();

    if (query.artist) params.set("artist_name", query.artist);
    params.set("track_name", query.song);

    const exactUrl = `${LRCLIB_BASE_URL}/get?${params.toString()}`;
    const exactRes = await fetch(exactUrl);
    if (exactRes.ok) {
      const data = await exactRes.json();
      const lyrics = data?.plainLyrics || data?.syncedLyrics || null;

      if (lyrics) {
        return {
          found: true,
          lyrics,
          source: "lrclib",
          title: data?.trackName || query.song,
          artist: data?.artistName || query.artist,
          confidence: query.artist ? 0.9 : 0.8,
        };
      }
    }

    const searchParams = new URLSearchParams();
    searchParams.set("q", query.cleaned);

    const searchUrl = `${LRCLIB_BASE_URL}/search?${searchParams.toString()}`;
    const searchRes = await fetch(searchUrl);

    if (searchRes.ok) {
      const results = await searchRes.json();
      const first = Array.isArray(results) ? results[0] : null;
      const lyrics = first?.plainLyrics || first?.syncedLyrics || null;

      if (lyrics) {
        return {
          found: true,
          lyrics,
          source: "lrclib",
          title: first?.trackName || query.song,
          artist: first?.artistName || query.artist,
          confidence: 0.72,
        };
      }
    }

    return {
      found: false,
      lyrics: null,
      source: "lrclib",
      title: query.song,
      artist: query.artist,
      confidence: 0,
    };
  } catch (error: any) {
    return {
      found: false,
      lyrics: null,
      source: "lrclib",
      title: query.song,
      artist: query.artist,
      confidence: 0,
      providerError: error?.message || "Error en LRCLIB",
    };
  }
}
