import { Message, PermissionFlagsBits } from "discord.js";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { addServerStress, rememberDeletedMessage } from "./automodState";

// Regex de slurs y evasiones críticas globales (respaldo heurístico)
const STRICT_EVASION_REGEX =
  /(?:n[i1l!|]gg[e3a@4]r|f[a@4]gg[o0]t|\bk[y1]s\b|d[i1]sc[o0]rd\s*\.\s*gg\/[^\s]+|fr[e3][e3]\s*n[i1]tr[o0]|st[e3][a@4]m\s*g[i1]ft|cr[y1]pt[o0]\s*g[i1]v[e3][a@4]w[a@4]y)/i;

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "|": "i",
  "¡": "i",
  "3": "e",
  "€": "e",
  "4": "a",
  "@": "a",
  "^": "a",
  "5": "s",
  "$": "s",
  "§": "s",
  "7": "t",
  "+": "t",
  "8": "b",
};

/**
 * Escapa caracteres especiales de regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normaliza texto eliminando acentos, caracteres invisibles, leetspeak y colapsando repeticiones.
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  // 1. Quitar acentos (diacríticos) y caracteres zero-width / invisibles
  let normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, "");

  // 2. Minúsculas
  normalized = normalized.toLowerCase();

  // 3. Sustituciones de Leetspeak y símbolos habituales
  let translated = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    translated += LEET_MAP[ch] ?? ch;
  }

  // 4. Colapso de repeticiones consecutivas (ej: "paaaalaaaabra" -> "palabra")
  const collapsed = translated.replace(/(.)\1+/g, "$1");

  return collapsed;
}

/**
 * Evalúa si el contenido coincide con alguna palabra prohibida o con patrones estrictos.
 * Utiliza límites de palabra para evitar falsos positivos con palabras legítimas (Efecto Scunthorpe).
 */
export function checkBannedWords(
  content: string,
  bannedWords: string[] = [],
): { hit: boolean; word?: string; reason?: string } {
  if (!content) return { hit: false };

  const normalized = normalizeText(content);

  // 1. Slurs y evasiones críticas globales
  if (STRICT_EVASION_REGEX.test(normalized)) {
    return {
      hit: true,
      word: "Patrón Estricto Global",
      reason: "Patrón tóxico/scam de alta severidad detectado",
    };
  }

  if (!bannedWords || bannedWords.length === 0) {
    return { hit: false };
  }

  for (const rawWord of bannedWords) {
    const cleanWord = normalizeText(rawWord.trim());
    if (cleanWord.length < 2) continue;

    // Construir expresión regular que busque las letras consecutivas del término,
    // permitiendo separadores/símbolos entre ellas pero exigiendo límite de palabra
    // para evitar falsos positivos con palabras legítimas que las contengan.
    const chars = cleanWord.split("").map((c) => escapeRegex(c));
    const patternStr = `(^|[^a-z0-9])${chars.join("[\\W_\\s]*")}($|[^a-z0-9])`;
    const regex = new RegExp(patternStr, "i");

    if (regex.test(normalized)) {
      return {
        hit: true,
        word: rawWord,
        reason: `Coincidencia con término bloqueado: ${rawWord}`,
      };
    }
  }

  return { hit: false };
}

/**
 * Middleware para procesar mensajes en messageCreate y aplicar filtro de palabras prohibidas.
 */
export async function handleWordFilter(
  message: Message,
  settings?: any,
): Promise<boolean> {
  if (!message.guild || message.author.bot) return false;

  // Los administradores o moderadores con ManageMessages son inmunes al filtro
  if (
    message.guild.ownerId === message.author.id ||
    message.member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
    message.member?.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return false;
  }

  const isEnabled = Boolean(settings?.securityModules?.wordFilter);
  if (!isEnabled) return false;

  const bannedWords: string[] = settings?.bannedWords ?? [];
  const check = checkBannedWords(message.content, bannedWords);

  if (!check.hit) return false;

  // Registrar mensaje borrado para posible auditoría o recuperación de falso positivo
  rememberDeletedMessage(
    message.guild.id,
    message.author.id,
    message.channel.id,
    message.content,
  );

  // Borrar mensaje
  await message.delete().catch(() => null);

  // Aumentar estrés del servidor
  await addServerStress(message.guild.id, 15);

  // Mensaje de advertencia temporal en el canal (se autodestruye en 4 segundos)
  if ("send" in message.channel) {
    const warnNotice = await message.channel
      .send(
        `⚠️ <@${message.author.id}>, tu mensaje fue eliminado por contener términos no permitidos.`,
      )
      .catch(() => null);

    if (warnNotice) {
      setTimeout(() => {
        warnNotice.delete().catch(() => null);
      }, 4000);
    }
  }

  // Enviar log detallado a moderación
  await HoshikoLogger.sendLog(
    message.guild,
    "AUTOMOD",
    `🛡️ **Filtro de Palabras (Anti-Bypass):** Se eliminó un mensaje de <@${message.author.id}> por contener un término prohibido (\`${check.word}\`).\n**Extracto:** \`${message.content.slice(0, 100)}\``,
    message.author,
  );

  return true;
}
