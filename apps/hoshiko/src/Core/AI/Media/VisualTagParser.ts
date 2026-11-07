export interface ParsedVisualResponse {
  cleanText: string;
  visualQuery: string | null;
}

export class VisualTagParser {
  private static readonly TAG_REGEX = /\[VISUAL_SEARCH:\s*["“']?([^"”'\]\r\n]{3,120})["”']?\s*\]\s*$/i;

  static parse(rawResponse: string): ParsedVisualResponse {
    if (!rawResponse || typeof rawResponse !== "string") {
      return { cleanText: "", visualQuery: null };
    }

    const match = rawResponse.match(this.TAG_REGEX);
    if (!match) {
      return {
        cleanText: rawResponse.trim(),
        visualQuery: null,
      };
    }

    const query = match[1].trim();
    const cleanText = rawResponse.replace(match[0], "").trim();

    return {
      cleanText,
      visualQuery: query.length >= 3 ? query : null,
    };
  }
}
