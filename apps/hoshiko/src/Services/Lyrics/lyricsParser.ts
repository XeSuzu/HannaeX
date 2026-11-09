import { ParsedLyricsCommand } from "./types";

export const TRANSLATION_OR_ROMANIZATION_REGEX =
  /\b(?:en\s+(?:español|espanol|ingl[eé]s|japon[eé]s|coreano|chino|romaji|r[oō]maji|pinyin)|traducid[ao]s?|traducci[oó]n(?:es)?|romanizad[ao]s?|romaji|r[oō]maji|pinyin|pronunciaci[oó]n|subtitulad[ao]s?|sub\s*español)\b/i;

export function isTranslationOrRomanizationQuery(text: string): boolean {
  return TRANSLATION_OR_ROMANIZATION_REGEX.test(text);
}

export function buildLyricsPrefixRegex(prefix?: string): RegExp {
  const custom = prefix ? prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "x";
  return new RegExp(
    `^(?:hoshi(?:\\s+ask)?\\s+|(?:${custom}|x|h!)(?:\\s*ask)?\\s*)(?:busca\\s+(?:la|las)\\s+letras?|dame\\s+(?:la|las)\\s+letras?|letras?|lyrics)(?:\\s+de)?\\s+`,
    "i",
  );
}

export function parseLyricsCommand(
  content: string,
  prefix?: string,
): ParsedLyricsCommand | null {
  const raw = content.trim();

  const rx = buildLyricsPrefixRegex(prefix);
  const match = raw.match(rx);
  if (!match) return null;

  let cleaned = raw.slice(match[0].length).trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  // Si la petición contiene intención de traducción o romanización (japonés, chino, coreano, etc.),
  // se delega directamente al modelo de IA (Gemini) en vez de al buscador léxico de canciones.
  if (isTranslationOrRomanizationQuery(cleaned)) {
    return null;
  }

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
