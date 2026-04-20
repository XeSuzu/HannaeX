import { ParsedLyricsCommand } from "./types";

const NOISE_PATTERNS = [
  /\bofficial video\b/gi,
  /\bofficial audio\b/gi,
  /\bofficial lyric video\b/gi,
  /\blyrics\b/gi,
  /\baudio\b/gi,
  /\bvideo\b/gi,
  /\bvisualizer\b/gi,
  /\bmv\b/gi,
  /\bhd\b/gi,
  /\b4k\b/gi,
];

function stripNoise(value: string): string {
  let out = value;

  for (const pattern of NOISE_PATTERNS) {
    out = out.replace(pattern, " ");
  }

  out = out
    .replace(/\bfeat\.?\b/gi, "ft")
    .replace(/\bfeaturing\b/gi, "ft")
    .replace(/\s*\((official|lyrics|audio|video)[^)]+\)/gi, " ")
    .replace(/\s*\[(official|lyrics|audio|video)[^\]]+\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return out;
}

export function normalizeLyricsQuery(
  parsed: ParsedLyricsCommand,
): ParsedLyricsCommand {
  return {
    ...parsed,
    cleaned: stripNoise(parsed.cleaned),
    song: stripNoise(parsed.song),
    artist: parsed.artist ? stripNoise(parsed.artist) : null,
  };
}
