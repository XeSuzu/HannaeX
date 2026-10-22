import type { Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { generateResponseStream, type GeminiTool } from "../../Services/gemini";
import { markAsAiMessage } from "./adminMessageTracker";

export interface ConversationReplyResult {
  fullText: string;
  groundingMetadata?: any;
}

export async function sendConversationReply(
  message: Message,
  systemInstruction: string,
  historyForApi: Content[],
  isDirectInteraction: boolean,
  safety: "relaxed" | "standard" | "strict",
): Promise<ConversationReplyResult> {
  const tools: GeminiTool[] = isDirectInteraction ? [{ googleSearch: {} }] : [];
  let stream;
  let fullText = "";
  let lastGroundingMetadata: any = null;

  async function consumeStream(s: AsyncIterable<any>): Promise<string> {
    let text = "";
    for await (const chunk of s) {
      if (chunk.candidates?.[0]?.finishReason === "SAFETY") throw new Error("PROHIBITED_CONTENT");
      if (typeof chunk.text === "function") {
        text += chunk.text();
      }
      const meta = chunk.candidates?.[0]?.groundingMetadata;
      if (meta) {
        if (!lastGroundingMetadata) {
          lastGroundingMetadata = { ...meta };
        } else {
          lastGroundingMetadata = {
            ...lastGroundingMetadata,
            ...meta,
            webSearchQueries: [
              ...new Set([
                ...(lastGroundingMetadata.webSearchQueries || []),
                ...(meta.webSearchQueries || []),
              ]),
            ],
            groundingChunks: [
              ...(lastGroundingMetadata.groundingChunks || []),
              ...(meta.groundingChunks || []),
            ],
          };
        }
      }
    }
    return text;
  }

  try {
    stream = await generateResponseStream(systemInstruction, historyForApi, safety, tools);
    fullText = await consumeStream(stream);
  } catch (toolErr: any) {
    if (toolErr?.message === "PROHIBITED_CONTENT") throw toolErr;

    if (tools.length > 0) {
      const errCode = toolErr?.status || toolErr?.code || "TOOL_SEARCH_ERROR";
      const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
      console.warn(`[AI/SearchFallback] Herramienta googleSearch falló (${errCode}: ${errMsg.slice(0, 100)}). Degradando a generación de texto puro.`);
      stream = await generateResponseStream(systemInstruction, historyForApi, safety, []);
      fullText = await consumeStream(stream);
    } else {
      throw toolErr;
    }
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

  return {
    fullText: cleanText,
    groundingMetadata: lastGroundingMetadata,
  };
}
