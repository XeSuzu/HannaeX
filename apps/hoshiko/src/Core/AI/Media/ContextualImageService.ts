import { SearchService, isQuerySafe } from "../../../Services/search";
import { ImageValidator } from "./ImageValidator";

export interface ContextualImageResult {
  url: string;
  title: string;
  source: string;
}

export interface FindContextualImageOptions {
  isDirectQuery?: boolean;
}

const EXPLICIT_VISUAL_REQUEST_PATTERNS = [
  /(?<![a-záéíóúüñ])(?:mu[eé]strame|ense[ñn]ame|quiero ver|puedes mostrarme|podr[ií]as mostrarme|d[eé]jame ver|b[uú]scame una? (?:foto|imagen|fotograf[ií]a))(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:fotograf[ií]as? de|fotos? de|im[aá]genes? de|imagen de|una fotograf[ií]a|una foto|una imagen|ilustraci[oó]n de|dibujo de|retrato de)(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:c[oó]mo se ve|c[oó]mo luce|qu[eé] aspecto tiene|aspecto de|apariencia de|diferencias? visuales?)(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:mapa de|bandera de|plano de|diagrama visual de)(?![a-záéíóúüñ])/i,
];

const NON_VISUAL_PATTERNS = [
  /^(?:[¿?¡!\s]*)(?:hola|buenas|c[oó]mo est[aá]s|qu[eé] tal|gracias|adi[oó]s|bye|xd|jaja)(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:c[oó]digo|typescript|javascript|python|java|rust|golang|c\+\+|html|css|sql|react|node\.?js|error|debug|funci[oó]n|algoritmo|regex|variable|recursividad|recursi[oó]n|bucle|array|arreglo|objeto|clase|interfaz|promesa|async|await|compilador|backend|frontend)(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:ram|rom|cpu|gpu|sistema operativo|base de datos)(?![a-záéíóúüñ])/i,
  /(?<![a-záéíóúüñ])(?:por qu[eé]|c[oó]mo funciona|qu[eé] diferencia hay|opini[oó]n|crees que|qu[eé] piensas|filosof[ií]a|consejo)(?![a-záéíóúüñ])/i,
];

const NON_DIRECT_QUERY_QUESTION_PATTERNS = [
  /^(?:qu[eé]\s+(?:es|son|significa|diferencia\s+hay)|c[oó]mo\s+(?:funciona|puedo|hago)|por\s+qu[eé]|expl[ií]came|cu[aá]l\s+es\s+la\s+diferencia)(?![a-záéíóúüñ])/i,
];

export class ContextualImageService {
  /**
   * Indica si el mensaje del usuario es una consulta conceptual, técnica o de código
   * que NO solicita ni amerita adjuntar una imagen.
   */
  static isNonVisualPrompt(userPrompt: string): boolean {
    if (!userPrompt || typeof userPrompt !== "string") return false;
    const text = userPrompt.trim();
    if (!text) return false;

    const hasExplicitVisualRequest = EXPLICIT_VISUAL_REQUEST_PATTERNS.some((p) => p.test(text));
    if (hasExplicitVisualRequest) {
      // Incluso con verbos visuales, si es código puro se descarta
      if (/\b(?:javascript|typescript|python|recursividad|variable|algoritmo|regex|sql|ram\b|rom\b)\b/i.test(text)) {
        return true;
      }
      return false;
    }

    if (NON_VISUAL_PATTERNS.some((p) => p.test(text))) {
      return true;
    }

    if (NON_DIRECT_QUERY_QUESTION_PATTERNS.some((p) => p.test(text.replace(/^[¿?¡!\s]+/, "")))) {
      return true;
    }

    return false;
  }

  /**
   * Limpia una oración de usuario con intención visual para extraer el término clave de búsqueda.
   */
  static extractCleanSearchQuery(rawText: string): string {
    let q = rawText
      .trim()
      .replace(/^(?:hoshi(?:\s+ask)?\b|(?:h!|x)\s*(?:ask\b)?)/i, "")
      .replace(/[?¿!¡"“”]/g, "")
      .trim();

    // Remover cláusulas conversacionales al final (ej: "y explícame qué estoy viendo", "y dime qué es")
    q = q
      .replace(
        /\s+(?:y\s+)?(?:expl[ií]came|dime|cu[eé]ntame|descr[ií]beme|comenta|detalla|qu[eé]\s+estoy\s+viendo|qu[eé]\s+se\s+ve|por\s+favor)\b.*$/i,
        "",
      )
      .trim();

    // Remover verbos de solicitud visual al inicio
    q = q
      .replace(
        /^(?:por\s+favor\s+)?(?:puedes\s+mostrarme|podr[ií]as\s+mostrarme|mu[eé]strame|ense[ñn]ame|quiero\s+ver|d[eé]jame\s+ver|b[uú]scame|dame)\s+/i,
        "",
      )
      .trim();

    // Remover sustantivos visuales introductorios ("una fotografía de la", "una imagen de una", "el aspecto de un", "las diferencias visuales entre")
    q = q
      .replace(
        /^(?:(?:un|una|el|la|los|las)\s+)?(?:fotograf[ií]as?|fotos?|im[aá]genes?|imagen|ilustraciones?|ilustraci[oó]n|dibujos?|retratos?|aspecto|apariencia|diferencias?\s+visuales?)\s+(?:de(?:\s+(?:un|una|el|la|los|las)|l)?|entre)\s+/i,
        "",
      )
      .trim();

    // Remover giros interrogativos visuales ("cómo se ve un", "cómo luce la", "qué aspecto tiene el")
    q = q
      .replace(
        /^(?:c[oó]mo\s+(?:se\s+ve|luce|es)|qu[eé]\s+(?:aspecto|forma|apariencia)\s+tiene)\s+(?:(?:un|una|el|la|los|las)\s+)?/i,
        "",
      )
      .trim();

    // Remover artículos iniciales sobrantes si quedó una frase nominal simple
    q = q.replace(/^(?:el|la|los|las|un|una)\s+/i, "").trim();

    return q;
  }

  /**
   * Determina si una consulta de usuario amerita adjuntar una imagen ilustrativa.
   */
  static shouldSearchImage(userPrompt: string): { eligible: boolean; query?: string } {
    if (!userPrompt || userPrompt.trim().length < 6) return { eligible: false };
    const text = userPrompt.trim();

    // 1. Descartar de inmediato saludos, dudas de programación pura, hardware conceptual y reflexiones
    if (this.isNonVisualPrompt(text)) {
      return { eligible: false };
    }

    // 2. Comprobar si coincide con intenciones visuales explícitas
    const isVisual = EXPLICIT_VISUAL_REQUEST_PATTERNS.some((p) => p.test(text));
    if (!isVisual) return { eligible: false };

    // 3. Comprobar seguridad de la query según lista negra
    if (!isQuerySafe(text)) return { eligible: false };

    // 4. Limpiar query para el motor de búsqueda
    const cleanQuery = this.extractCleanSearchQuery(text);

    if (cleanQuery.length < 3 || cleanQuery.length > 80) return { eligible: false };

    return { eligible: true, query: cleanQuery };
  }

  /**
   * Determina si una cadena ya es un término de búsqueda directo (ej. extraído de [VISUAL_SEARCH: "..."]).
   */
  private static isEligibleDirectQuery(queryOrPrompt: string): boolean {
    if (!queryOrPrompt || typeof queryOrPrompt !== "string") return false;
    const trimmed = queryOrPrompt.trim();
    if (trimmed.length < 3 || trimmed.length > 100) return false;
    if (/[¿?]/.test(trimmed)) return false;
    if (this.isNonVisualPrompt(trimmed)) return false;
    if (!isQuerySafe(trimmed)) return false;
    return true;
  }

  /**
   * Recupera y valida una imagen contextual de alta calidad usando Serper.dev y el ImageValidator.
   * Acepta tanto el prompt crudo del usuario como una query descriptiva extraída de [VISUAL_SEARCH: "..."].
   */
  static async findContextualImage(
    queryOrPrompt: string,
    options: FindContextualImageOptions = {},
  ): Promise<ContextualImageResult | null> {
    if (!queryOrPrompt || typeof queryOrPrompt !== "string") return null;

    let searchQuery: string | null = null;

    // 1. Verificar primero si es una oración de usuario con intención visual explícita
    const check = this.shouldSearchImage(queryOrPrompt);
    if (check.eligible && check.query) {
      searchQuery = check.query;
    } else if (options.isDirectQuery || this.isEligibleDirectQuery(queryOrPrompt)) {
      // 2. Si viene de [VISUAL_SEARCH: "..."] o es un término descriptivo directo
      const cleaned = queryOrPrompt.replace(/^[¿?¡!"“”'\s]+|[?¡!"“”'\s]+$/g, "").trim();
      if (
        cleaned.length >= 3 &&
        cleaned.length <= 100 &&
        !this.isNonVisualPrompt(cleaned) &&
        isQuerySafe(cleaned)
      ) {
        searchQuery = cleaned;
      }
    }

    if (!searchQuery) {
      return null;
    }

    try {
      // 1. Búsqueda en Serper.dev con SafeSearch forzado (hasta 5 candidatos para tolerar fallos de validación)
      const candidates = await SearchService.searchImages(searchQuery, 5, true);
      if (!candidates || candidates.length === 0) {
        console.info(`[ContextualImageService] Sin resultados de búsqueda para: "${searchQuery}"`);
        return null;
      }

      // 2. Validación de cada candidato con ImageValidator (SSRF, HEAD/Range, MIME, tamaño <= 8MB, Magic Bytes)
      for (const item of candidates) {
        if (!item.imageUrl || !item.imageUrl.startsWith("https://")) continue;

        const validation = await ImageValidator.validateImageUrl(item.imageUrl);
        if (validation.valid && validation.finalUrl) {
          return {
            url: validation.finalUrl,
            title: item.title || searchQuery,
            source: item.source || "Web",
          };
        }
      }

      console.info(
        `[ContextualImageService] Ningún candidato superó ImageValidator (${candidates.length} evaluados) para: "${searchQuery}"`,
      );
      return null;
    } catch (err) {
      console.warn("[ContextualImageService] Fallo no crítico buscando imagen:", err);
      return null;
    }
  }
}
