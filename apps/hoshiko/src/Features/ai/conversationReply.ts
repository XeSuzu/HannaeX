import type { Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { generateResponseStream, type GeminiTool } from "../../Services/gemini";
import { ContextualImageService } from "../../Core/AI/Media/ContextualImageService";
import { AiEmbedBuilder } from "../../Core/AI/Presentation/AiEmbedBuilder";
import { EmbedComposer } from "../../Core/AI/Presentation/EmbedComposer";
import { VisualTagParser } from "../../Core/AI/Media/VisualTagParser";
import { markAsAiMessage } from "./adminMessageTracker";

export interface ConversationReplyResult {
  fullText: string;
  groundingMetadata?: any;
}

/**
 * Sanitiza el texto de respuesta generado por la IA antes de enviarlo a Discord.
 * - Elimina prefijos de citas markdown de Discord (>>>)
 * - Remueve prefijos de diálogo o etiquetas de turno repetidas por el modelo
 *   (ej. "(En respuesta a Alice):", "[en respuesta a Bob]:", "[Hoshiko dice]:", "Hoshiko:")
 */
export function sanitizeReplyText(raw: string): string {
  let text = (raw || "").trim();
  // Strip Discord quote block prefix
  text = text.replace(/^>>>\s*/, "");
  // Strip dialogue prefixes or turn tags echoed from conversational context
  const DIALOGUE_PREFIX_REGEX =
    /^(?:(?:\(|\[)\s*en respuesta a [^)\n\]]+(?:\)|\]):?\s*|\[Hoshiko(?:\s+dice)?\]:?\s*|Hoshiko:\s*)/i;
  while (DIALOGUE_PREFIX_REGEX.test(text)) {
    text = text.replace(DIALOGUE_PREFIX_REGEX, "").trim();
  }

  // Strip boilerplate AI self-identification at the beginning (e.g. "Como modelo de lenguaje grande...")
  text = text
    .replace(
      /^(?:(?:como\s+)?(?:un[a]?\s+)?(?:gran\s+)?modelo\s+de\s+(?:lenguaje|ia)(?:\s+grande)?(?:\s+(?:entrenad[oa]|desarrollad[oa])\s+por\s+Google)?|como\s+(?:una?\s+)?(?:inteligencia\s+artificial|ia))\b[,\s.:-]*/i,
      "",
    )
    .trim();

  // Neutralize self-referential Google origin claims without altering third-party tech references
  const SELF_GOOGLE_REGEX =
    /\b(?:soy|fui)\s+(?:(?:un[a]?\s+)?(?:modelo|ia|asistente)\s+)?(?:cread[oa]|desarrollad[oa]|entrenad[oa])\s+por\s+Google\b/gi;
  if (SELF_GOOGLE_REGEX.test(text)) {
    text = text.replace(SELF_GOOGLE_REGEX, "soy Hoshiko de este servidor");
  }

  return text || "...";
}

export async function sendConversationReply(
  message: Message,
  systemInstruction: string,
  historyForApi: Content[],
  isDirectInteraction: boolean,
  safety: "relaxed" | "standard" | "strict",
  mode: string = "neko",
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
      } else if (typeof chunk.text === "string") {
        text += chunk.text;
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

  // Decisión de imagen integrada en una sola pasada: parsear tag [VISUAL_SEARCH: "..."]
  const parsed = VisualTagParser.parse(fullText);
  const cleanText = sanitizeReplyText(parsed.cleanText);

  let imageResult = null;
  if (parsed.visualQuery) {
    imageResult = await ContextualImageService.findContextualImage(parsed.visualQuery).catch(() => null);
  }

  // Generar presentación directa con EmbedComposer (1 a 3 embeds sin paginación por defecto)
  const embeds = EmbedComposer.compose(cleanText, {
    botUser: message.client?.user as any,
    imageResult,
  });

  let sent: Message | null = null;
  if ("reply" in message && typeof message.reply === "function") {
    sent = await message.reply({ embeds }).catch(() => null) as Message | null;
  }

  if (sent?.id) {
    markAsAiMessage(sent.id);
  }

  return {
    fullText: cleanText,
    groundingMetadata: lastGroundingMetadata,
  };
}
