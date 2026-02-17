import axios from "axios";
import "dotenv/config"; // Asegura que las variables de entorno se carguen

// ========================
//  VALIDACIÓN DE ENTORNO
// ========================
// Verificamos que las claves existan al iniciar para evitar errores en ejecución.
if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.SEARCH_ENGINE_ID) {
  console.error(
    "❌ Faltan variables de entorno para la búsqueda de Google (GOOGLE_SEARCH_API_KEY, SEARCH_ENGINE_ID).",
  );
}

// ========================
//  INTERFACES (Moldes para nuestros datos)
// ========================

// 1. Interfaz para un item individual en los resultados de búsqueda.
//    Solo definimos las propiedades que realmente vamos a usar.
interface SearchResultItem {
  snippet: string;
  link: string;
  title: string;
}

// 2. Interfaz para la respuesta completa de la API de Google.
interface GoogleSearchResponse {
  items: SearchResultItem[];
}

// ========================
//  FUNCIÓN DE BÚSQUEDA
// ========================

/**
 * Realiza una búsqueda en Google usando la Custom Search API.
 * @param consulta El término a buscar.
 * @returns El "snippet" (descripción) del primer resultado, o un mensaje de error.
 */
export async function buscarEnGoogle(consulta: string): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.SEARCH_ENGINE_ID;

  // Si faltan las claves, devolvemos un error controlado.
  if (!apiKey || !searchEngineId) {
    return "El servicio de búsqueda no está configurado correctamente.";
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(consulta)}`;

  try {
    // Le decimos a Axios qué tipo de respuesta esperamos usando nuestra interfaz.
    const response = await axios.get<GoogleSearchResponse>(url);
    const searchResults = response.data.items;

    if (!searchResults || searchResults.length === 0) {
      return "No se encontraron resultados para tu búsqueda.";
    }

    // TypeScript ahora sabe que searchResults[0] tiene una propiedad 'snippet'.
    return searchResults[0].snippet;
  } catch (error: any) {
    console.error(
      "Error en buscarEnGoogle:",
      error.response?.data?.error?.message || error.message,
    );
    return "Hubo un error al contactar el servicio de búsqueda de Google.";
  }
}
