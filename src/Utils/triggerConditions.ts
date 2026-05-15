import { Message } from "discord.js";
import { HoshikoClient } from "../index";

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
 * Checks if a message mentions the bot with additional text.
 * Only activates if there is content after the @mention.
 * @param message - Discord message to evaluate
 * @param client - Hoshiko client instance
 * @returns True if bot is mentioned with additional content
 */
export function isMentionTrigger(
  message: Message,
  client: HoshikoClient,
): boolean {
  const hasMention = message.mentions.users.has(client.user!.id);
  const contentAfterMention = message.content
    .replace(`<@${client.user!.id}>`, "")
    .trim();
  return hasMention && contentAfterMention.length > 0;
}

/**
 * Checks if the message is a reply directly to the bot.
 * @param message - Discord message to evaluate
 * @param client - Hoshiko client instance
 * @returns True if message is a reply to a bot message
 */
export async function checkReplyingToBot(
  message: Message,
  client: HoshikoClient,
): Promise<boolean> {
  if (!message.reference?.messageId) return false;
  if (message.mentions.everyone) return false;

  const repliedMsg = await message.channel.messages
    .fetch(message.reference.messageId)
    .catch(() => null);
  return repliedMsg?.author.id === client.user!.id;
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
