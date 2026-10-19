/**
 * Utilidades de seguridad para interacciones y componentes de Discord.
 * Previene errores de la API de Discord (como 50035 COMPONENT_INVALID_EMOJI y BASE_TYPE_BAD_LENGTH)
 * mediante validación previa y degradación elegante.
 */

const UNICODE_EMOJI_REGEX =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)/u;

const CUSTOM_EMOJI_REGEX = /^(?:<a?:\w{2,32}:\d{17,20}>|\d{17,20})$/;

/**
 * Valida si un string es un emoji apto para Discord (Unicode estándar o Custom Emoji).
 * Si el valor no es un emoji válido (ej: símbolos tipográficos como "▸", "›", "❯"),
 * devuelve `undefined` para que el componente se renderice limpiamente sin emoji
 * en lugar de provocar un error 50035 de Discord API.
 */
export function safeEmoji(value?: string | null): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (UNICODE_EMOJI_REGEX.test(trimmed) || CUSTOM_EMOJI_REGEX.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

/**
 * Trunca texto de forma segura respetando los límites de longitud de Discord.
 * Añade una elipsis "…" si el texto supera el límite especificado.
 */
export function truncate(text: unknown, maxLength: number): string {
  if (text === null || text === undefined) return "";
  const str = typeof text === "string" ? text : String(text);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}
