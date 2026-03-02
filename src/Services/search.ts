import axios from "axios";
import "dotenv/config";

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
// LISTA NEGRA DE TÉRMINOS
// ========================
const BLACKLISTED_TERMS = [
  "porn", "pornography", "hentai", "nsfw", "nude", "naked", "xxx",
  "sex", "erotic", "explicit", "gore", "snuff", "rape", "loli",
  "cp", "child porn",
];

/**
 * Verifica si un query contiene términos prohibidos.
 * @param query El término a verificar.
 * @returns true si el query es seguro, false si contiene términos prohibidos.
 */
export function isQuerySafe(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return !BLACKLISTED_TERMS.some((term) => lowerQuery.includes(term));
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
