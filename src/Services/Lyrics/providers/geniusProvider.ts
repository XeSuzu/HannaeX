import Genius from "genius-lyrics";
import { LyricsResult, ParsedLyricsCommand } from "../types";

const client = new Genius.Client(process.env.GENIUS_API_KEY || "");

export async function geniusProvider(
  query: ParsedLyricsCommand,
): Promise<LyricsResult> {
  try {
    const searchQuery = query.artist
      ? `${query.song} ${query.artist}`
      : query.song;

    const searches = await client.songs.search(searchQuery);

    if (!searches || searches.length === 0) {
      return {
        found: false,
        lyrics: null,
        source: "genius",
        title: query.song,
        artist: query.artist,
        confidence: 0,
      };
    }

    const firstSong = searches[0];
    const lyrics = await firstSong.lyrics();

    if (!lyrics) {
      return {
        found: false,
        lyrics: null,
        source: "genius",
        title: query.song,
        artist: query.artist,
        confidence: 0,
      };
    }

    return {
      found: true,
      lyrics,
      source: "genius",
      title: firstSong.title || query.song,
      artist: firstSong.artist?.name || query.artist,
      confidence: query.artist ? 0.95 : 0.85,
    };
  } catch (error: any) {
    return {
      found: false,
      lyrics: null,
      source: "genius",
      title: query.song,
      artist: query.artist,
      confidence: 0,
      providerError: error?.message || "Error en Genius",
    };
  }
}
