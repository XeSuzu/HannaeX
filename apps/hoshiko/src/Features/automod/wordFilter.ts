import { Message, PermissionFlagsBits } from "discord.js";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { addServerStress, rememberDeletedMessage } from "./automodState";

// Regex de slurs y evasiones críticas globales (respaldo heurístico)
const STRICT_EVASION_REGEX =
  /(?:n[i1l!|]gg[e3a@4]r|f[a@4]gg[o0]t|\bk[y1]s\b|d[i1]sc[o0]rd\s*\.\s*gg\/[^\s]+|fr[e3][e3]\s*n[i1]tr[o0]|st[e3][a@4]m\s*g[i1]ft|cr[y1]pt[o0]\s*g[i1]v[e3][a@4]w[a@4]y)/i;

// Mapeo exhaustivo de homóglifos cirílicos y griegos a sus equivalentes latinos
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cirílico minúsculas
  "а": "a", "е": "e", "ё": "e", "о": "o", "р": "p", "с": "c",
  "у": "y", "х": "x", "і": "i", "ї": "i", "ј": "j", "ѕ": "s",
  "к": "k", "м": "m", "п": "n", "т": "t", "в": "b",
  // Cirílico mayúsculas
  "А": "a", "В": "b", "Е": "e", "Ё": "e", "К": "k", "М": "m",
  "Н": "h", "О": "o", "Р": "p", "С": "c", "Т": "t", "У": "y",
  "Х": "x", "І": "i", "Ї": "i", "Ј": "j", "Ѕ": "s",
  // Griego minúsculas y mayúsculas
  "α": "a", "Α": "a", "β": "b", "Β": "b", "γ": "y", "ε": "e",
  "Ε": "e", "η": "h", "Η": "h", "ι": "i", "Ι": "i", "κ": "k",
  "Κ": "k", "ο": "o", "Ο": "o", "ρ": "p", "Ρ": "p", "τ": "t",
  "Τ": "t", "υ": "y", "Υ": "y", "χ": "x", "Χ": "x", "ν": "v",
};

// Palabras cortas legítimas de alta frecuencia que no deben sufrir colapso accidental
const COLLISION_WORDS = new Set([
  "as",
  "is",
  "si",
  "no",
  "el",
  "al",
  "un",
  "ha",
  "he",
  "in",
  "to",
  "at",
  "on",
  "it",
  "me",
  "we",
  "be",
  "do",
  "go",
  "so",
]);

// Sufijos comunes en español e inglés para flexibilidad morfológica
const COMMON_SUFFIXES =
  "(?:s|es|ed|ing|er|ers|or|ors|y|ly|ish|hole|holes|head|heads|a|o|as|os|ita|ito|itas|itos|isima|isimo|isimas|isimos|azo|aza|azos|azas|on|ona|ones|onas)?";

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
 * Normaliza texto eliminando homóglifos, acentos, caracteres invisibles, leetspeak y colapsando repeticiones.
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  // 1. Transliteración de homóglifos cirílicos y griegos a caracteres latinos
  let homoglyphsReplaced = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    homoglyphsReplaced += HOMOGLYPH_MAP[ch] ?? ch;
  }

  // 2. Quitar acentos (diacríticos) y caracteres zero-width / invisibles / Hangul Fillers (AUD-09)
  let normalized = homoglyphsReplaced
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u3164\u115F\u1160\uFFA0\u034F\u17B4\u17B5\u00AD\u180E]/g,
      "",
    );

  // 3. Minúsculas
  normalized = normalized.toLowerCase();

  // 4. Sustituciones de Leetspeak y símbolos habituales
  let translated = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    translated += LEET_MAP[ch] ?? ch;
  }

  // 5. Reducción inteligente de repeticiones consecutivas evitando colisiones ("ass" -> "as")
  // Primero contraemos repeticiones excesivas (3 o más repeticiones consecutivas se reducen a 2)
  const reduced = translated.replace(/(.)\1{2,}/g, "$1$1");

  // Colapsar repeticiones dobles solo si la palabra no contiene "ass"
  // y no coincide con palabras cortas legítimas de uso común ("as", "is", etc.)
  const collapsed = reduced.replace(/[a-z0-9]+/g, (word) => {
    // Si la palabra contiene o es "ass", preservamos "ass" para evitar colisión con "as"
    if (word.includes("ass")) {
      return word.replace(/(.)\1+/g, (match, char) => (char === "s" ? "ss" : char));
    }
    const single = word.replace(/(.)\1+/g, "$1");
    if (COLLISION_WORDS.has(single)) {
      return word;
    }
    return single;
  });

  return collapsed;
}

/**
 * Evalúa si el contenido coincide con alguna palabra prohibida o con patrones estrictos.
 * Utiliza límites de palabra y flexibilidad morfológica para evitar falsos positivos (Efecto Scunthorpe).
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
    // permitiendo separadores/símbolos entre ellas y sufijos morfológicos comunes,
    // pero exigiendo límite de palabra para evitar falsos positivos.
    const chars = cleanWord.split("").map((c) => escapeRegex(c));
    const patternStr = `(^|[^a-z0-9])${chars.join("[\\W_\\s]*")}${COMMON_SUFFIXES}($|[^a-z0-9])`;
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
 * Middleware para procesar mensajes en messageCreate / messageUpdate y aplicar filtro de palabras prohibidas.
 */
export async function handleWordFilter(
  message: Message,
  settings?: any,
): Promise<boolean> {
  if (!message.guild || message.author.bot) return false;

  let config = settings;
  if (!config) {
    config = await SettingsManager.getLite(
      message.guild.id,
      "securityModules bannedWords exemptChannels exemptRoles",
    );
  }

  // Los administradores, moderadores o canales/roles exentos son inmunes al filtro
  const memberRoles: any = message.member?.roles?.cache;
  const hasExemptRole = memberRoles
    ? typeof memberRoles.some === "function"
      ? memberRoles.some((r: any) => (config?.exemptRoles || []).includes(r.id))
      : Array.from(memberRoles.values ? memberRoles.values() : memberRoles).some((r: any) =>
          (config?.exemptRoles || []).includes(r.id),
        )
    : false;

  const isStaffOrExempt =
    message.guild.ownerId === message.author.id ||
    Boolean(message.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) ||
    Boolean(message.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) ||
    (config?.exemptChannels || []).includes(message.channel.id) ||
    hasExemptRole;

  if (isStaffOrExempt) {
    return false;
  }

  const isEnabled = Boolean(config?.securityModules?.wordFilter);
  if (!isEnabled) return false;

  const bannedWords: string[] = config?.bannedWords ?? [];
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
  HoshikoLogger.markBotMessageDelete(message.id);
  let deletedOk = true;
  await message.delete().catch(() => {
    deletedOk = false;
  });

  // Aumentar estrés del servidor
  await addServerStress(message.guild.id, 15);

  // Mensaje de advertencia temporal en el canal (se autodestruye en 4 segundos)
  if ("send" in message.channel) {
    const warnNotice = await (message.channel as any)
      .send(
        `⚠️ <@${message.author.id}>, tu mensaje fue eliminado por contener términos no permitidos.`,
      )
      .catch(() => null);

    if (warnNotice) {
      setTimeout(() => {
        if (warnNotice.id) HoshikoLogger.markBotMessageDelete(warnNotice.id);
        warnNotice.delete().catch(() => null);
      }, 4000);
    }
  }

  // Enviar log detallado a moderación
  await HoshikoLogger.sendLog(
    message.guild,
    "AUTOMOD",
    `🛡️ **Filtro de Palabras (Anti-Bypass):** Se detectó un mensaje de <@${message.author.id}> en <#${message.channel.id}> por contener un término prohibido (\`${check.word}\`).\n**Resultado:** ${deletedOk ? "Mensaje eliminado correctamente" : "No se pudo eliminar el mensaje"}\n**Extracto:** \`${message.content.slice(0, 100)}\``,
    message.author,
  );

  return true;
}

