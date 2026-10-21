import { Message } from "discord.js";
import { HoshikoClient } from "../index";
import { isAdminMessage } from "../Features/ai/adminMessageTracker";

/** Commands that use the "hoshi ask" trigger pattern */
export const TRIGGER_COMMANDS = ["ask", "img"] as const;

/**
 * Checks if a prefix string starts with "hoshi" (case-insensitive).
 * @param prefix - Command prefix to check
 * @returns True if prefix starts with "hoshi"
 */
export function isHoshiPrefix(prefix: string): boolean {
  return prefix.toLowerCase().startsWith("hoshi");
}

/**
 * Checks if a command name is in the trigger commands list.
 * @param commandName - Command name to check
 * @returns True if command uses passthrough trigger
 */
export function isCommandPassthrough(commandName: string): boolean {
  return TRIGGER_COMMANDS.includes(
    commandName as (typeof TRIGGER_COMMANDS)[number],
  );
}

/**
 * Detects "hoshi ask" prefix for AI queries.
 * Requires non-empty content after the prefix.
 * @param message - Discord message to evaluate
 * @returns True if message matches hoshi ask pattern
 */
export function isHoshiAsk(message: Message): boolean {
  const lower = message.content.toLowerCase();
  return (
    lower.startsWith("hoshi ask ") &&
    message.content.slice(10).trim().length > 0
  );
}

/**
 * Detects "hoshi ask img" or "x img"/"x ximg" prefixes for image search.
 * @param message - Discord message to evaluate
 * @returns True if message matches image command pattern
 */
export function isImgCommand(message: Message): boolean {
  const lower = message.content.toLowerCase();
  if (lower.startsWith("hoshi ask img "))
    return message.content.slice(15).trim().length > 0;
  if (lower.startsWith("x img ") || lower.startsWith("x ximg "))
    return message.content.slice(6).trim().length > 0;
  return false;
}

/**
 * Remueve bloques de código y citas de Markdown de Discord para no activar
 * por menciones pasivas o accidentales encerradas en formato citado o técnico.
 */
export function stripQuotesAndCode(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " ") // Bloques de código multilínea
    .replace(/`[^`\n]*`/g, " ")       // Código inline
    .replace(/^>>>[\s\S]*$/gm, " ")   // Blockquotes multilínea
    .replace(/^>[^\n]*/gm, " ");      // Blockquotes estándar de una línea
}

/**
 * Checks if a message mentions the bot with direct and legitimate intent.
 * Ignora menciones que estén dentro de blockquotes o código.
 * Si existen múltiples menciones a usuarios, aplica reglas estructurales deterministas:
 * 1. Si la primera mención en el texto activo es Hoshiko -> directa.
 * 2. Si la primera mención es otro usuario humano, solo se activa si Hoshiko es interpelada
 *    como vocativo explícito de cierre (ej. "... <@otro>, qué opinas, <@Hoshiko>?").
 * 3. En cualquier caso referencial o ambiguo, evita falsas activaciones secundarias.
 * @param message - Discord message to evaluate
 * @param client - Hoshiko client instance
 * @returns True if bot is directly and legitimately mentioned
 */
export function isMentionTrigger(
  message: Message,
  client: HoshikoClient,
): boolean {
  if (!client.user) return false;
  if (!message.mentions.users.has(client.user.id)) return false;

  // 1. Limpiar citas y bloques de código para comprobar si la mención vive fuera de ellos
  const activeContent = stripQuotesAndCode(message.content);
  const trimmed = activeContent.trimStart();

  // 2. La mención debe situarse explícitamente al comienzo del contenido activo
  // Acepta <@id> o <@!id> seguido de fin de string, espacio o puntuación
  const initialMentionRegex = new RegExp(
    `^<@!?${client.user.id}>(?:[\\s,:\\.!?¿¡]|$)`,
  );

  return initialMentionRegex.test(trimmed);
}

/**
 * Resuelve si un mensaje es una respuesta legítima a una intervención previa del bot,
 * retornando el mensaje referenciado para evitar llamadas REST duplicadas a Discord.
 * Si el mensaje citado fue un anuncio o comando administrativo (/say), retorna isReply: false.
 */
export async function resolveReplyingToBot(
  message: Message,
  client: HoshikoClient,
): Promise<{ isReply: boolean; repliedMsg: Message | null }> {
  if (!message.reference?.messageId) return { isReply: false, repliedMsg: null };
  if (message.mentions.everyone) return { isReply: false, repliedMsg: null };

  const repliedMsg = await message.channel.messages
    .fetch(message.reference.messageId)
    .catch(() => null);

  if (!repliedMsg) return { isReply: false, repliedMsg: null };

  // El mensaje debe haber sido emitido por la cuenta del bot
  if (repliedMsg.author.id !== client.user!.id) {
    return { isReply: false, repliedMsg };
  }

  // Si fue un mensaje administrativo (/say, etc.), NO es respuesta al personaje conversacional
  if (isAdminMessage(repliedMsg)) {
    return { isReply: false, repliedMsg };
  }

  return { isReply: true, repliedMsg };
}

/**
 * Checks if the message is a reply directly to a legitimate AI bot message.
 * @param message - Discord message to evaluate
 * @param client - Hoshiko client instance
 * @param preFetchedRepliedMsg - Optional pre-fetched message to avoid duplicate network calls
 * @returns True if message is a reply to an AI bot message
 */
export async function checkReplyingToBot(
  message: Message,
  client: HoshikoClient,
  preFetchedRepliedMsg?: Message | null,
): Promise<boolean> {
  if (preFetchedRepliedMsg !== undefined) {
    if (!preFetchedRepliedMsg) return false;
    if (preFetchedRepliedMsg.author.id !== client.user!.id) return false;
    return !isAdminMessage(preFetchedRepliedMsg);
  }
  const res = await resolveReplyingToBot(message, client);
  return res.isReply;
}

/**
 * Validates that command arguments are present after prefix and command name.
 * @param message - Discord message
 * @param prefixLength - Length of the prefix used
 * @param commandName - Name of the command invoked
 * @returns True if arguments exist after command
 */
export function hasCommandArguments(
  message: Message,
  prefixLength: number,
  commandName: string,
): boolean {
  const contentAfterPrefix = message.content.slice(prefixLength).trim();
  return (
    contentAfterPrefix.toLowerCase().startsWith(`${commandName} `) &&
    contentAfterPrefix.slice(commandName.length).trim().length > 0
  );
}

/** Patterns用于检测prompt注入攻击 */
const INJECTION_PATTERNS = [
  /ignora (tus |todas )?(instrucciones|reglas)/i,
  /eres ahora/i,
  /nuevo (rol|sistema|prompt)/i,
  /actúa como/i,
  /forget (your |all )?(instructions|rules)/i,
  /you are now/i,
  /new (role|system|prompt)/i,
];

/**
 * Detects potential prompt injection attempts in text.
 * @param text - Text to analyze
 * @returns True if injection pattern detected
 */
export function containsPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
