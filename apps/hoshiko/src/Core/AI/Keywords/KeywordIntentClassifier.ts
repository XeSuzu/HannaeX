import { DynamicKeywordRegistry } from "./DynamicKeywordRegistry";
import {
  KEYWORD_TAXONOMY,
  KeywordCategory,
  normalizeSearchToken,
} from "./KeywordTaxonomy";

export interface KeywordClassificationResult {
  isResearch: boolean;
  isTelegraphic: boolean;
  categories: KeywordCategory[];
  matchedKeywords: string[];
  deductionHint?: string;
}

export class KeywordIntentClassifier {
  private static readonly dynamicRegistry = DynamicKeywordRegistry.getInstance();

  /**
   * Determina si el texto es un saludo trivial, risa o despedida informal que
   * nunca debe disparar búsqueda web ni cuota de investigación.
   */
  private static isCasualChat(clean: string): boolean {
    if (
      /^(?:hola|buenas|holi|hey|hello|hi|buenos dias|buenas tardes|buenas noches|adios|chau|chao|hasta luego|bye|gracias|muchas gracias|jaj+a*|xd|ok|sip|nop)\b/i.test(
        clean,
      ) &&
      clean.length < 35
    ) {
      return true;
    }
    if (/^(?:cuentame un chiste|dime un chiste|me siento un poco cansado)\b/i.test(clean)) {
      return true;
    }
    return false;
  }

  /**
   * Evalúa si una consulta es telegráfica (cadena de sustantivos / palabras clave
   * sin sintaxis oracional completa, ej. "chainsawman 2026 estado", "boca river ayer").
   */
  static isTelegraphic(text: string): boolean {
    const clean = normalizeSearchToken(text);
    if (!clean) return false;

    const words = clean.split(/\s+/).filter(Boolean);
    // Típicamente entre 1 y 6 palabras sueltas sin signos de interrogación ni estructura de pregunta formal
    if (words.length >= 1 && words.length <= 6) {
      const hasFormalQuestionSyntax = /^(que|quien|cuando|donde|por que|como|cual|cuanto)\s+(es|fue|son|esta|estan|paso|ocurrio|sucedio|juega|cuesta)\b/i.test(
        clean,
      );
      return !hasFormalQuestionSyntax;
    }
    return false;
  }

  /**
   * Clasifica exhaustivamente el mensaje según la taxonomía estática y las palabras dinámicas aprendidas.
   */
  static classify(text: string): KeywordClassificationResult {
    if (!text) {
      return {
        isResearch: false,
        isTelegraphic: false,
        categories: [],
        matchedKeywords: [],
      };
    }

    const clean = normalizeSearchToken(text);

    // 1. Descarte inmediato de charlas casuales
    if (this.isCasualChat(clean)) {
      return {
        isResearch: false,
        isTelegraphic: false,
        categories: [],
        matchedKeywords: [],
      };
    }

    const matchedCategories = new Set<KeywordCategory>();
    const matchedTerms: string[] = [];

    // 2. Evaluación contra la Taxonomía Base Estática
    for (const group of KEYWORD_TAXONOMY) {
      for (const pattern of group.patterns) {
        const match = clean.match(pattern);
        if (match) {
          matchedCategories.add(group.category);
          matchedTerms.push(match[0]);
        }
      }
    }

    // 3. Evaluación contra el Registro de Palabras Aprendidas Dinámicamente
    if (this.dynamicRegistry.hasLearnedKeyword(clean)) {
      matchedCategories.add("general");
      matchedTerms.push("[learned_keyword]");
    }

    const isResearch = matchedCategories.size > 0;
    const isTelegraphicQuery = isResearch && this.isTelegraphic(clean);

    let deductionHint: string | undefined;

    if (isTelegraphicQuery) {
      if (matchedCategories.has("anime")) {
        deductionHint =
          "[Deducción de consulta telegráfica: Consulta sobre anime/manga. Identifica si el usuario alude a la obra original (manga/novela) o adaptaciones (anime/películas/secuelas) y resume con certeza su estado actual y fechas oficiales].";
      } else if (matchedCategories.has("sports")) {
        deductionHint =
          "[Deducción de consulta telegráfica: Consulta deportiva sobre resultados, marcadores, rivales o próximos partidos. Brinda información fáctica concreta con rival, fecha y resultado exacto].";
      } else if (matchedCategories.has("gaming")) {
        deductionHint =
          "[Deducción de consulta telegráfica: Consulta sobre videojuegos o hardware. Especifica con precisión datos técnicos, fechas de lanzamiento o estado de filtraciones].";
      } else if (matchedCategories.has("economy")) {
        deductionHint =
          "[Deducción de consulta telegráfica: Consulta de cotización, divisas o finanzas. Proporciona los valores de cotización más recientes y fuentes].";
      } else if (matchedCategories.has("music")) {
        deductionHint =
          "[Deducción de consulta musical: El usuario solicita letra, traducción o romanización de una canción. Consulta y verifica la letra fáctica real en la web para no inventar versos. Si hay una errata en el título o artista, corrígela con naturalidad y entrega el texto fiel (original, romaji y/o traducción en español)].";
      } else {
        deductionHint =
          "[Deducción de consulta telegráfica: El usuario envió palabras clave sueltas. Razoná la entidad y el aspecto fáctico consultado para responder directo al punto].";
      }
    }

    return {
      isResearch,
      isTelegraphic: isTelegraphicQuery,
      categories: Array.from(matchedCategories),
      matchedKeywords: matchedTerms,
      deductionHint,
    };
  }

  /**
   * Método de compatibilidad booleano rápido
   */
  static isResearchQuery(text: string): boolean {
    return this.classify(text).isResearch;
  }
}
