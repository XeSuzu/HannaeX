import type { Tool, Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { generateResponseStream } from "../../Services/gemini";
import { markAsAiMessage } from "./adminMessageTracker";

export async function sendConversationReply(
  message: Message,
  systemInstruction: string,
  historyForApi: Content[],
  isDirectInteraction: boolean,
  safety: "relaxed" | "standard" | "strict",
): Promise<void> {
  const tools: Tool[] = isDirectInteraction ? [{ googleSearchRetrieval: {} }] : [];
  let stream;
  try {
    stream = await generateResponseStream(systemInstruction, historyForApi, safety, tools);
  } catch (toolErr: any) {
    if (tools.length > 0) {
      const errCode = toolErr?.status || toolErr?.code || "TOOL_SEARCH_ERROR";
      const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
      console.warn(`[AI/SearchFallback] Herramienta googleSearchRetrieval falló (${errCode}: ${errMsg.slice(0, 100)}). Degradando a generación de texto puro.`);
      stream = await generateResponseStream(systemInstruction, historyForApi, safety, []);
    } else {
      throw toolErr;
    }
  }
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.candidates?.[0]?.finishReason === "SAFETY") throw new Error("PROHIBITED_CONTENT");
    fullText += chunk.text();
  }
  const MAX = 1996;
  const cleanText = (fullText.trim() || "...").replace(/^>>>\s*/, "");
  if (cleanText.length <= MAX) {
    const sent = await message.reply(cleanText);
    if (sent?.id) markAsAiMessage(sent.id);
  } else {
    const chunks: string[] = [];
    let remaining = cleanText;
    while (remaining.length > 0) {
      if (remaining.length <= MAX) { chunks.push(remaining); break; }
      let cutAt = remaining.lastIndexOf(" ", MAX);
      if (cutAt === -1) cutAt = MAX;
      chunks.push(remaining.substring(0, cutAt));
      remaining = remaining.substring(cutAt).trim();
    }
    const firstSent = await message.reply(chunks[0]);
    if (firstSent?.id) markAsAiMessage(firstSent.id);
    for (let i = 1; i < chunks.length; i++) {
      const extraSent = await (message.channel as any).send(chunks[i]);
      if (extraSent?.id) markAsAiMessage(extraSent.id);
    }
  }
}
