import axios from "axios";

if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.SEARCH_ENGINE_ID) {
  console.error(
    "❌ Faltan variables de entorno para la búsqueda de Google (GOOGLE_SEARCH_API_KEY, SEARCH_ENGINE_ID).",
  );
}

// ========================
// INTERFACES — TEXTO
// ========================
interface SearchResultItem {
  snippet: string;
  link: string;
  title: string;
}

interface GoogleSearchResponse {
  items: SearchResultItem[];
}

// ========================
// INTERFACES — IMÁGENES (Serper)
// ========================
interface SerperImageResult {
  imageUrl: string;
  link: string;
  source: string;
  title: string;
}

interface SerperImageResponse {
  images: SerperImageResult[];
}

export interface ImageResult {
  imageUrl: string;
  link: string;
  source: string;
  title: string;
}

// ========================
// LISTA NEGRA DE TÉRMINOS (HashMap para mejor rendimiento)
// ========================
// Términos que nunca se permiten en búsquedas (ni en canales NSFW)
const BLACKLISTED_TERMS_SET = new Set([
  // Contenido sexual explícito (variaciones comunes)
  "porn",
  "pornography",
  "nsfw",
  "nude",
  "naked",
  "xxx",
  "sex",
  "erotic",
  "hentai",
  "milf",
  "fapping",
  "pussy",
  "dick",
  "cock",
  "vagina",
  "asshole",
  "buttplug",
  "dildo",
  // Contenido gráfico/violento
  "gore",
  "snuff",
  "torture porn",
  "real gore",
  "guro",
  // Contenido que involucra menores (CRÍTICO - sin excepciones)
  "loli",
  "shota",
  "cp",
  "child porn",
  "child sexual abuse",
  "underage",
  "minors sexual",
  "young looking nude",
  "teen porn",
  "pokemon porn",
  "shaved",
  "jailbait",
  //bestiality y contenido no consensuado
  "bestiality",
  "zoophilia",
  "rape",
  "non-consensual",
  // Drogas peligrosas
  "how to make meth",
  "how to make毒品",
  "drug synthesis",
  "how to make weed",
  // Otros términos problemáticos
  "doxxing",
  "how to doxx",
  "hitman",
  "assassin for hire",
]);

// Términos que pueden malinterpretarse pero son legítimos en contexto
const CONTEXTUAL_TERMS: Record<string, string[]> = {
  sex: ["sex education", "safe sex", "sex chromosomes", "sex positions"],
  ass: [
    "assassin",
    "assignment",
    "asset",
    "class",
    "bass guitar",
    "mass",
    "pass",
  ],
  cock: ["cocktail", "peacock", "rooster", "stopcock"],
  dick: ["dickens", "deck", "pick"],
};

/**
 * Normaliza el texto para búsqueda (remueve caracteres especiales)
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

/**
 * Verifica si un query contiene términos prohibidos.
 * Usa HashMap (Set) para O(1) por término.
 * @param query El término a verificar.
 * @returns true si el query es seguro, false si contiene términos prohibidos.
 */
export function isQuerySafe(query: string): boolean {
  const words = normalize(query).split(/\s+/);

  for (const word of words) {
    if (BLACKLISTED_TERMS_SET.has(word)) {
      return false;
    }
  }

  // Verificar términos contextuales (pueden tener falsos positivos)
  for (const [term, safeContexts] of Object.entries(CONTEXTUAL_TERMS)) {
    if (query.toLowerCase().includes(term)) {
      // Si contiene el término problemático, verificar si está en contexto seguro
      const isSafe = safeContexts.some((ctx) =>
        query.toLowerCase().includes(ctx),
      );
      if (!isSafe) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Obtiene una lista de términos bloqueados (útil para debugging o logs)
 */
export function getBlacklistedTerms(): string[] {
  return Array.from(BLACKLISTED_TERMS_SET);
}

// ========================
// BÚSQUEDA DE TEXTO — Google Custom Search
// ========================
export async function buscarEnGoogle(consulta: string): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return "El servicio de búsqueda no está configurado correctamente.";
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(consulta)}`;

  try {
    const response = await axios.get<GoogleSearchResponse>(url);
    const searchResults = response.data.items;

    if (!searchResults || searchResults.length === 0) {
      return "No se encontraron resultados para tu búsqueda.";
    }

    return searchResults[0].snippet;
  } catch (error: any) {
    console.error(
      "Error en buscarEnGoogle:",
      error.response?.data?.error?.message || error.message,
    );
    return "Hubo un error al contactar el servicio de búsqueda de Google.";
  }
}

// ========================
// BÚSQUEDA DE IMÁGENES — Serper.dev
// ========================
export class SearchService {
  /**
   * Busca imágenes usando Serper.dev con SafeSearch activo por defecto.
   * En canales NSFW se puede desactivar pasando safe: false.
   */
  static async searchImages(
    query: string,
    num: number = 5,
    safe: boolean = true,
  ): Promise<ImageResult[] | null> {
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      console.error("[SearchService] Falta SERPER_API_KEY en el .env");
      return null;
    }

    try {
      const response = await axios.post<SerperImageResponse>(
        "https://google.serper.dev/images",
        {
          q: query,
          num,
          ...(safe && { safe: "active" }), // 👈 SafeSearch activado cuando safe=true
        },
        {
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
        },
      );

      const items = response.data.images;
      if (!items || items.length === 0) return null;

      return items.map((item) => ({
        imageUrl: item.imageUrl,
        link: item.link,
        source: item.source || "Google Images",
        title: item.title || query,
      }));
    } catch (error: any) {
      console.error(
        "[SearchService] Error buscando imágenes con Serper:",
        error.response?.data?.message || error.message,
      );
      return null;
    }
  }
}
