import { SearchService, isQuerySafe } from "../../../Services/search";
import { ImageValidator } from "./ImageValidator";

export interface ContextualImageResult {
  url: string;
  title: string;
  source: string;
}

const VISUAL_INTENT_PATTERNS = [
  /\b(?:c[oó]mo es|c[oó]mo se ve|c[oó]mo luce|mu[eé]strame|ense[ñn]ame|foto de|imagen de|aspecto de|apariencia de)\b/i,
  /\b(?:qu[eé] aspecto tiene|qu[eé] forma tiene|dibujo de|ilustraci[oó]n de|plano de|bandera de|mapa de)\b/i,
  /\b(?:qu[eé] es un[a]?|qui[eé]n es|d[oó]nde queda|d[oó]nde est[aá]|animal|monumento|ave|planta|edificio|paisaje)\b/i,
];

const NON_VISUAL_PATTERNS = [
  /\b(?:hola|buenas|c[oó]mo est[aá]s|qu[eé] tal|gracias|adi[oó]s|bye|xd|jaja)\b/i,
  /\b(?:c[oó]digo|typescript|javascript|python|error|debug|funci[oó]n|algoritmo|regex|sql)\b/i,
  /\b(?:por qu[eé]|opini[oó]n|crees que|qu[eé] piensas|filosof[ií]a|consejo|ayuda)\b/i,
];

export class ContextualImageService {
  /**
   * Determina si una consulta de usuario amerita adjuntar una imagen ilustrativa.
   */
  static shouldSearchImage(userPrompt: string): { eligible: boolean; query?: string } {
    if (!userPrompt || userPrompt.trim().length < 6) return { eligible: false };
    const text = userPrompt.trim();

    // 1. Descartar de inmediato saludos, dudas de programación pura y reflexiones
    if (NON_VISUAL_PATTERNS.some((p) => p.test(text))) {
      return { eligible: false };
    }

    // 2. Comprobar si coincide con intenciones visuales
    const isVisual = VISUAL_INTENT_PATTERNS.some((p) => p.test(text));
    if (!isVisual) return { eligible: false };

    // 3. Comprobar seguridad de la query según lista negra
    if (!isQuerySafe(text)) return { eligible: false };

    // 4. Limpiar query para el motor de búsqueda
    const cleanQuery = text
      .replace(/^(?:hoshi\b|h!\s*|x\s*)/i, "")
      .replace(/^(?:mu[eé]strame|ense[ñn]ame|foto de|imagen de|c[oó]mo es|c[oó]mo luce)\s+/i, "")
      .replace(/[?¿!¡]/g, "")
      .trim();

    if (cleanQuery.length < 3 || cleanQuery.length > 80) return { eligible: false };

    return { eligible: true, query: cleanQuery };
  }

  /**
   * Recupera y valida una imagen contextual de alta calidad usando Serper.dev y el ImageValidator.
   */
  static async findContextualImage(userPrompt: string): Promise<ContextualImageResult | null> {
    const check = this.shouldSearchImage(userPrompt);
    if (!check.eligible || !check.query) return null;

    try {
      // 1. Búsqueda en Serper.dev con SafeSearch forzado
      const candidates = await SearchService.searchImages(check.query, 3, true);
      if (!candidates || candidates.length === 0) return null;

      // 2. Validación de cada candidato con ImageValidator (SSRF, HEAD, Magic Bytes)
      for (const item of candidates) {
        if (!item.imageUrl || !item.imageUrl.startsWith("https://")) continue;

        const validation = await ImageValidator.validateImageUrl(item.imageUrl);
        if (validation.valid && validation.finalUrl) {
          return {
            url: validation.finalUrl,
            title: item.title || check.query,
            source: item.source || "Web",
          };
        }
      }

      return null;
    } catch (err) {
      console.warn("[ContextualImageService] Fallo no crítico buscando imagen:", err);
      return null;
    }
  }
}
