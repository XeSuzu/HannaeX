export type LyricsSource = "genius" | "lrclib" | "lyricsovh";

export interface ParsedLyricsCommand {
  raw: string;
  cleaned: string;
  song: string;
  artist: string | null;
  trigger: "hoshi-ask";
}

export interface LyricsResult {
  found: boolean;
  lyrics: string | null;
  source: LyricsSource | null;
  title: string | null;
  artist: string | null;
  thumbnail: string | null; // ← nuevo
  confidence: number;
  providerError?: string | null;
}
