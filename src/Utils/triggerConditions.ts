import { Message } from "discord.js";
import { HoshikoClient } from "../index";

export const TRIGGER_COMMANDS = ["ask", "img"] as const;

export function isHoshiPrefix(prefix: string): boolean {
  return prefix.toLowerCase().startsWith("hoshi");
}

export function isCommandPassthrough(commandName: string): boolean {
  return TRIGGER_COMMANDS.includes(
    commandName as (typeof TRIGGER_COMMANDS)[number],
  );
}

export function isHoshiAsk(message: Message): boolean {
  const lower = message.content.toLowerCase();
  return (
    lower.startsWith("hoshi ask ") &&
    message.content.slice(10).trim().length > 0
  );
}

export function isImgCommand(message: Message): boolean {
  const lower = message.content.toLowerCase();
  if (lower.startsWith("hoshi ask img "))
    return message.content.slice(15).trim().length > 0;
  if (lower.startsWith("x img ") || lower.startsWith("x ximg "))
    return message.content.slice(6).trim().length > 0;
  return false;
}

export function isMentionTrigger(
  message: Message,
  client: HoshikoClient,
): boolean {
  const hasMention = message.mentions.users.has(client.user!.id);
  const contentAfterMention = message.content
    .replace(`<@${client.user!.id}>`, "")
    .trim();
  // ✅ Solo activa si hay texto después del @
  return hasMention && contentAfterMention.length > 0;
}

export async function checkReplyingToBot(
  message: Message,
  client: HoshikoClient,
): Promise<boolean> {
  if (!message.reference?.messageId) return false;
  if (message.mentions.everyone) return false;
  // ✅ Reply directo al bot es suficiente, sin exigir "hoshi ask"
  const repliedMsg = await message.channel.messages
    .fetch(message.reference.messageId)
    .catch(() => null);
  return repliedMsg?.author.id === client.user!.id;
}

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

// ✅ Detección de prompt injection
const INJECTION_PATTERNS = [
  /ignora (tus |todas )?(instrucciones|reglas)/i,
  /eres ahora/i,
  /nuevo (rol|sistema|prompt)/i,
  /actúa como/i,
  /forget (your |all )?(instructions|rules)/i,
  /you are now/i,
  /new (role|system|prompt)/i,
];

export function containsPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
