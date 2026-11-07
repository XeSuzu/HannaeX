import type { IConversationTurn } from "../../../Features/ai/PrivateConversationSessionManager";

const STOPWORDS_ES = new Set([
  "de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "por", "un",
  "para", "con", "no", "una", "su", "al", "lo", "como", "mas", "pero", "sus", "le",
  "ya", "o", "fue", "este", "ha", "si", "porque", "esta", "son", "entre", "cuando",
  "muy", "sin", "sobre", "tambien", "me", "hasta", "hay", "donde", "quien", "desde",
  "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese",
  "eso", "ante", "ellos", "e", "esto", "mi", "antes", "algunos", "unos", "yo", "otro",
  "otras", "otra", "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos",
  "cual", "poco", "ella", "estar", "estas", "algunas", "algo", "nosotros", "mis",
  "tu", "tus", "te", "ti", "hacer", "hola", "hoshiko", "bueno", "bien", "gracias"
]);

export class TopicCompactor {
  private static extractKeywords(turns: IConversationTurn[]): string[] {
    const wordFreq = new Map<string, number>();

    for (const turn of turns) {
      const words = turn.text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/);

      for (const w of words) {
        if (w.length >= 4 && !STOPWORDS_ES.has(w) && !/^\d+$/.test(w)) {
          wordFreq.set(w, (wordFreq.get(w) || 0) + (turn.role === "user" ? 2 : 1));
        }
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
  }

  static compactTurns(
    olderTurns: IConversationTurn[],
    previousSummary?: string,
  ): string {
    if (!olderTurns || olderTurns.length === 0) {
      return previousSummary || "";
    }

    const keywords = this.extractKeywords(olderTurns);
    if (keywords.length === 0) {
      return previousSummary || "";
    }

    const newTopics = keywords.join(", ");
    if (previousSummary && previousSummary.trim().length > 0) {
      const merged = `${previousSummary}; temas subsiguientes: ${newTopics}`;
      return merged.length > 200 ? `${merged.slice(0, 197)}...` : merged;
    }

    return `Temas previos tratados en la sesión: ${newTopics}.`;
  }
}
