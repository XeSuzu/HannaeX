/**
 * Fetches an anime GIF from a random pool of APIs.
 * If one API fails, it tries another.
 * @param category The category of the GIF (e.g., 'hug', 'kiss', 'pat').
 * @returns A URL to a GIF, or a fallback URL if all sources fail.
 */
export async function getAnimeGif(category: string): Promise<string> {
  const sources = [
    () => fetchNekos(category),
    () => fetchOtakuGifs(category),
    () => fetchWaifuIm(category),
  ];

  // Shuffle sources to try a random one first. If it fails, try another.
  const shuffled = sources.sort(() => Math.random() - 0.5);
  for (const source of shuffled) {
    try {
      const url = await source();
      if (url) return url;
    } catch (error) {
      // Opcional: puedes registrar los errores para depuración, pero el código continuará.
      // console.error(`Fallo al obtener GIF para "${category}":`, error);
    }
  }

  // GIF de respaldo si todas las fuentes fallan
  return "https://media.tenor.com/7X7HPs4.gif";
}

// ─── Fuente 1: nekos.best ───────────────────────────────────────────────────
/**
 * Obtiene un GIF de la API de nekos.best.
 * Categorías: hug, kiss, pat, slap, cry, wave, dance, blush, poke, bite, cuddle, highfive
 */
async function fetchNekos(category: string): Promise<string | null> {
  const res = await fetch(`https://nekos.best/api/v2/${category}?amount=20`);
  if (!res.ok) {
    throw new Error(`La API de Nekos.best devolvió ${res.status}`);
  }
  const json = await res.json();
  const results = json.results;
  if (!results || results.length === 0) {
    return null;
  }
  return results[Math.floor(Math.random() * results.length)].url;
}

// ─── Fuente 2: otakugifs.xyz ────────────────────────────────────────────────
/**
 * Obtiene un GIF de la API de otakugifs.xyz.
 * Categorías: nod, hug, kiss, pat, cry, blush, wave, dance, slap, poke, cuddle, highfive
 */
async function fetchOtakuGifs(category: string): Promise<string | null> {
  const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${category}`);
  if (!res.ok) {
    throw new Error(`La API de OtakuGifs devolvió ${res.status}`);
  }
  const json = await res.json();
  return json.url ?? null;
}

// ─── Fuente 3: waifu.im ─────────────────────────────────────────────────────
/**
 * Obtiene un GIF de la API de waifu.im.
 * Categorías limitadas: wink, happy, cry, blush, wave
 */
const WAIFU_IM_MAP: Record<string, string> = {
  happy: "happy",
  wink: "wink",
  cry: "cry",
  blush: "blush",
  wave: "wave",
};

async function fetchWaifuIm(category: string): Promise<string | null> {
  const mapped = WAIFU_IM_MAP[category];
  if (!mapped) throw new Error("Categoría no soportada por waifu.im");

  const res = await fetch(
    `https://api.waifu.im/search?included_tags=${mapped}&gif=true`,
  );
  if (!res.ok) throw new Error(`La API de waifu.im devolvió ${res.status}`);
  const json = await res.json();
  const images = json.images;
  if (!images || images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)].url;
}
