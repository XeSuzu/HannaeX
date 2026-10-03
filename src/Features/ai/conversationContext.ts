import type { Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { UserMemoryManager } from "../../Database/UserMemoryManager";
import { SystemPrompts } from "../../Utils/AI/SystemPrompts";
import type { SystemPromptContext } from "../../Utils/AI/SystemPrompts";
import type { IServerConfig } from "../../Models/serverConfig";
import type { HoshikoClient } from "../../client/HoshikoClient";

const EMPTY_MENTION_RESPONSES = ["¿Me llamaste?", "Dime~", "¿Qué pasó?", "Aquí estoy~ ¿en qué te ayudo?", "¿Sí?"];

export async function buildConversationContext(
  message: Message,
  client: HoshikoClient,
  config: IServerConfig,
  options: { isPremium: boolean; isMentioned: boolean; prefixMatch: boolean; isReplyToMe: boolean; isRandomTrigger: boolean },
): Promise<{ systemInstruction: string; historyForApi: Content[]; userMessage: string }> {
  const limit = options.isPremium ? 15 : 10;
  const prevMessages = await (message.channel as any).messages.fetch({ limit });
  const triggerType: SystemPromptContext["triggerType"] = options.isRandomTrigger ? "spontaneous" : options.isReplyToMe ? "reply" : "direct";
  const channelName = "name" in message.channel ? (message.channel as any).name : undefined;
  const userFacts = await UserMemoryManager.getFacts(message.author.id, message.guild!.id);
  const promptContext: SystemPromptContext = {
    guildName: message.guild!.name, channelName, triggerType, userFacts, currentUsername: message.author.username,
  };
  const systemInstruction = SystemPrompts.getInstruction(config, promptContext);
  const historyForApi: Content[] = [];
  const recentMessages = Array.from(prevMessages.values()).reverse().slice(0, -1) as Message[];
  const sortedMessages = recentMessages.filter((m) => m.author.id === client.user!.id || m.author.id === message.author.id);
  for (const m of sortedMessages) {
    const msgObj = m as Message;
    if (!msgObj.content && msgObj.attachments.size === 0) continue;
    const role = msgObj.author.id === client.user!.id ? "model" : "user";
    let textContent = msgObj.content.replace(/<@!?[0-9]+>/g, "").trim();
    if (msgObj.attachments.size > 0 && role === "user") textContent += " [El usuario envió una imagen/archivo]";
    const finalWord = role === "user" ? `[${msgObj.author.username} dice]: ${textContent || "..."}` : textContent;
    historyForApi.push({ role, parts: [{ text: finalWord || "..." }] });
  }
  let userMessage = message.content.replace(new RegExp(`<@!?${client.user!.id}>`, "g"), "").trim();
  if (!userMessage && options.isMentioned) userMessage = EMPTY_MENTION_RESPONSES[Math.floor(Math.random() * EMPTY_MENTION_RESPONSES.length)];
  if (options.prefixMatch) userMessage = message.content.substring(10).trim();
  else if (userMessage.toLowerCase().startsWith("hoshi ask ")) userMessage = userMessage.substring(10).trim();
  if (message.attachments.size > 0 && message.attachments.first()?.contentType?.startsWith("image/")) {
    try {
      const imgResponse = await fetch(message.attachments.first()!.url);
      const imgBuffer = await imgResponse.arrayBuffer();
      historyForApi.push({ role: "user", parts: [
        { text: `[${message.author.username} dice]: ${userMessage || "Mira esta imagen:"}` },
        { inlineData: { mimeType: message.attachments.first()!.contentType!, data: Buffer.from(imgBuffer).toString("base64") } },
      ] });
    } catch (err) {
      historyForApi.push({ role: "user", parts: [{ text: `[${message.author.username} dice]: ${userMessage} [Error al cargar la imagen enviada]` }] });
    }
  } else {
    historyForApi.push({ role: "user", parts: [{ text: `[${message.author.username} dice]: ${userMessage}` }] });
  }
  return { systemInstruction, historyForApi, userMessage };
}
