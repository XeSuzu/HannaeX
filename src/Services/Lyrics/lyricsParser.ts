import { ParsedLyricsCommand } from "./types";

const PREFIXES = [
  /^hoshi ask\s+busca la letra de\s+/i,
  /^hoshi ask\s+dame la letra de\s+/i,
  /^hoshi ask\s+letra de\s+/i,
];

export function parseLyricsCommand(
  content: string,
): ParsedLyricsCommand | null {
  const raw = content.trim();

  const matchedPrefix = PREFIXES.find((rx) => rx.test(raw));
  if (!matchedPrefix) return null;

  let cleaned = raw.replace(matchedPrefix, "").trim();

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  let song = cleaned;
  let artist: string | null = null;

  const dashParts = cleaned.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    song = dashParts[0].trim();
    artist = dashParts.slice(1).join(" - ").trim();
  } else {
    const deParts = cleaned.split(/\s+de\s+/i);
    if (deParts.length === 2) {
      song = deParts[0].trim();
      artist = deParts[1].trim();
    }
  }

  return {
    raw,
    cleaned,
    song,
    artist,
    trigger: "hoshi-ask",
  };
}
