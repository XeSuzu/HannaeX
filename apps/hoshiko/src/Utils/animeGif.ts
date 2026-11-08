import type { Message, User } from "discord.js";

const FETCH_TIMEOUT_MS = 2500;

/**
 * Mapeo explícito de categorías hacia endpoints válidos de nekos.best (/api/v2/{endpoint})
 */
export const NEKOS_BEST_MAP: Record<string, string> = {
  hug: "hug",
  cuddle: "cuddle",
  kiss: "kiss",
  poke: "poke",
  pat: "pat",
  slap: "slap",
  highfive: "highfive",
  bite: "bite",
  dance: "dance",
  sad: "cry", // nekos.best no tiene /sad (devuelve 404); usa /cry como respaldo
  happy: "happy",
  blush: "blush",
  cry: "cry",
  wave: "wave",
};

/**
 * Mapeo explícito de categorías hacia reacciones válidas de otakugifs.xyz (?reaction={reaction})
 */
export const OTAKUGIFS_MAP: Record<string, string> = {
  hug: "hug",
  cuddle: "cuddle",
  kiss: "kiss",
  poke: "poke",
  pat: "pat",
  slap: "slap",
  highfive: "cheers", // otakugifs.xyz no tiene highfive (devuelve 400); usa cheers como respaldo
  bite: "bite",
  dance: "dance",
  sad: "sad",
  happy: "happy",
  blush: "blush",
  cry: "cry",
  wave: "wave",
};

/**
 * Diccionario de GIFs de respaldo verificados (200 OK) por categoría en caso de caída total de APIs
 */
export const FALLBACK_GIFS: Record<string, string> = {
  hug: "https://nekos.best/api/v2/hug/b30aa74d-5d1c-4225-a242-30c5ed0f09f2.gif",
  cuddle: "https://nekos.best/api/v2/cuddle/e069ecdf-de75-4d40-ab3d-d4aadba5222c.gif",
  kiss: "https://nekos.best/api/v2/kiss/967f2aa5-f060-4952-a047-a5fdac855c92.gif",
  poke: "https://nekos.best/api/v2/poke/86618462-c8ae-4d26-84db-49c82cde75d3.gif",
  pat: "https://nekos.best/api/v2/pat/7367dc29-c526-4627-bcb7-36466bb5331c.gif",
  slap: "https://nekos.best/api/v2/slap/2cba47d6-f9c3-482a-9cb8-bfa3cc19d95c.gif",
  highfive: "https://nekos.best/api/v2/highfive/f6ef8fe9-b921-45ad-938d-c14a80371df0.gif",
  bite: "https://nekos.best/api/v2/bite/5671f449-3b62-4c1a-ab45-2f4f525fa5d7.gif",
  dance: "https://nekos.best/api/v2/dance/780a9054-3abf-4eb6-a284-04da2d25e08a.gif",
  sad: "https://cdn.otakugifs.xyz/gifs/sad/a0cfe9c9354c1c28.gif",
  happy: "https://nekos.best/api/v2/happy/dc952f98-63cc-4c91-a3ef-67ddf733897a.gif",
  blush: "https://nekos.best/api/v2/blush/50b11542-3d86-4368-af3c-1aa060cfcb72.gif",
  cry: "https://nekos.best/api/v2/cry/99197c00-401f-4aa3-a2f2-56460e772e23.gif",
  wave: "https://nekos.best/api/v2/wave/f9323caa-47e1-415e-95fb-fadf13dc409e.gif",
};

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtiene un GIF anime acorde a la categoría solicitada.
 * Prioriza el proveedor que soporta nativamente la categoría y usa respaldo verificado por acción.
 * @param category Categoría de la interacción (ej. 'hug', 'kiss', 'pat', 'sad', 'highfive').
 */
export async function getAnimeGif(category: string): Promise<string> {
  const normalized = category.toLowerCase().trim();

  let sources: Array<() => Promise<string | null>>;
  if (normalized === "sad") {
    // OtakuGifs tiene endpoint nativo 'sad'; Nekos.best usa 'cry' como secundario
    sources = [() => fetchOtakuGifs(normalized), () => fetchNekos(normalized)];
  } else if (normalized === "highfive") {
    // Nekos.best tiene endpoint nativo 'highfive'; OtakuGifs usa 'cheers' como secundario
    sources = [() => fetchNekos(normalized), () => fetchOtakuGifs(normalized)];
  } else {
    sources =
      Math.random() < 0.5
        ? [() => fetchNekos(normalized), () => fetchOtakuGifs(normalized)]
        : [() => fetchOtakuGifs(normalized), () => fetchNekos(normalized)];
  }

  for (const source of sources) {
    try {
      const url = await source();
      if (url && url.startsWith("https://")) return url;
    } catch {
      // Continúa con el siguiente proveedor
    }
  }

  return FALLBACK_GIFS[normalized] || FALLBACK_GIFS.hug;
}

// ─── Fuente 1: nekos.best ───────────────────────────────────────────────────
async function fetchNekos(category: string): Promise<string | null> {
  const endpoint = NEKOS_BEST_MAP[category] || category;
  const res = await fetchWithTimeout(
    `https://nekos.best/api/v2/${encodeURIComponent(endpoint)}?amount=5`,
  );
  if (!res.ok) {
    throw new Error(`Nekos.best HTTP ${res.status}`);
  }
  const json = (await res.json()) as { results?: Array<{ url?: string }> };
  const results = json.results;
  if (!results || results.length === 0) {
    return null;
  }
  return results[Math.floor(Math.random() * results.length)]?.url ?? null;
}

// ─── Fuente 2: otakugifs.xyz ────────────────────────────────────────────────
async function fetchOtakuGifs(category: string): Promise<string | null> {
  const reaction = OTAKUGIFS_MAP[category] || category;
  const res = await fetchWithTimeout(
    `https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(reaction)}`,
  );
  if (!res.ok) {
    throw new Error(`OtakuGifs HTTP ${res.status}`);
  }
  const json = (await res.json()) as { url?: string };
  return json.url ?? null;
}

/**
 * Devuelve el color hexadecimal del rol del miembro si tiene uno asignado (distinto de #000000),
 * o el color pastel por defecto de la interacción.
 */
export function resolveInteractionColor(
  member: { displayHexColor?: string } | null | undefined,
  fallbackHex: string,
): string {
  const hex = member?.displayHexColor;
  if (hex && hex.toLowerCase() !== "#000000") {
    return hex;
  }
  return fallbackHex;
}

/**
 * Resuelve el usuario objetivo de una interacción por prefijo (mención explícita en texto,
 * ID de Discord en argumentos o autor del mensaje respondido).
 */
export async function resolveInteractionTarget(
  message: Message,
  args: string[] = [],
): Promise<User | null> {
  // 1. Buscar mención explícita en el texto del comando (evita confundir con el ping del reply)
  const explicitMatch = message.content.match(/<@!?(\d{17,20})>/);
  if (explicitMatch) {
    const id = explicitMatch[1];
    const cached = message.mentions.users.get(id) ?? message.client.users.cache.get(id);
    if (cached) return cached;
    const fetched = await message.client.users.fetch(id).catch(() => null);
    if (fetched) return fetched;
  }

  // 2. Buscar ID numérico en el primer argumento
  const rawArg = args[0]?.replace(/[<@!>]/g, "").trim();
  if (rawArg && /^\d{17,20}$/.test(rawArg)) {
    const fetched = await message.client.users.fetch(rawArg).catch(() => null);
    if (fetched) return fetched;
  }

  // 3. Cualquier usuario mencionado en el mensaje (incluyendo reply con ping)
  const firstMention = message.mentions.users.first();
  if (firstMention) return firstMention;

  // 4. Si el mensaje es respuesta (reply) a otro mensaje sin ping activado
  if (message.reference?.messageId) {
    const refMsg = await message.channel.messages
      .fetch(message.reference.messageId)
      .catch(() => null);
    if (refMsg?.author) return refMsg.author;
  }

  return null;
}
