import type { Tool, Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { generateResponseStream } from "../../Services/gemini";

export async function sendConversationReply(
  message: Message,
  systemInstruction: string,
  historyForApi: Content[],
  isDirectInteraction: boolean,
  safety: "relaxed" | "standard" | "strict",
): Promise<void> {
  const tools = isDirectInteraction ? [{ google_search: {} } as unknown as Tool] : [];
  const stream = await generateResponseStream(systemInstruction, historyForApi, safety, tools);
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.candidates?.[0]?.finishReason === "SAFETY") throw new Error("PROHIBITED_CONTENT");
    fullText += chunk.text();
  }
  const MAX = 1996;
  const cleanText = (fullText.trim() || "...").replace(/^>>>\s*/, "");
  if (cleanText.length <= MAX) {
    await message.reply(cleanText);
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
    await message.reply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) await (message.channel as any).send(chunks[i]);
  }
}
