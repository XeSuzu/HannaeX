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
  return hasMention && contentAfterMention.length > 0;
}

export async function checkReplyingToBot(
  message: Message,
  client: HoshikoClient,
): Promise<boolean> {
  if (!message.reference?.messageId) return false;
  if (message.mentions.everyone) return false;
  if (!message.content.toLowerCase().startsWith("hoshi ask ")) return false;
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
