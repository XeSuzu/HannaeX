import type { Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { generateResponseStream, type GeminiTool } from "../../Services/gemini";
import { ContextualImageService } from "../../Core/AI/Media/ContextualImageService";
import { AiEmbedBuilder } from "../../Core/AI/Presentation/AiEmbedBuilder";
import { EmbedComposer } from "../../Core/AI/Presentation/EmbedComposer";
import { VisualTagParser } from "../../Core/AI/Media/VisualTagParser";
import { ConversationStatusManager, type StatusPhraseType } from "../../Core/AI/Status/ConversationStatusManager";
import { markAsAiMessage } from "./adminMessageTracker";
import { DynamicKeywordRegistry } from "../../Core/AI/Keywords/DynamicKeywordRegistry";
import { STOPWORDS } from "../../Core/AI/Keywords/KeywordTaxonomy";

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

/**
 * Neutraliza afirmaciones deícticas que asumen que una imagen fue adjuntada
 * ("En la imagen estás viendo...", "En la imagen puedes ver...", etc.)
 * cuando el proveedor de imágenes falló o no pudo adjuntar ninguna imagen.
 */
export function neutralizeFalseVisualClaims(text: string): string {
  if (!text) return "...";
  let out = text;

  // Caso: "En la imagen estás viendo una..." / "En la imagen puedes ver..." / "En esta fotografía se observa..."
  out = out.replace(
    /\b(En)\s+(?:la|esta)\s+(?:imagen|fotograf[ií]a|foto|ilustraci[oó]n)(?:\s+adjunta|\s+que\s+te\s+muestro)?\s+(?:est[aá]s\s+viendo|puedes\s+ver|pod[eé]s\s+ver|se\s+puede\s+ver|se\s+observa|se\s+aprecia|vemos)\s+/g,
    "Se aprecia ",
  );
  out = out.replace(
    /\b(en)\s+(?:la|esta)\s+(?:imagen|fotograf[ií]a|foto|ilustraci[oó]n)(?:\s+adjunta|\s+que\s+te\s+muestro)?\s+(?:est[aá]s\s+viendo|puedes\s+ver|pod[eé]s\s+ver|se\s+puede\s+ver|se\s+observa|se\s+aprecia|vemos)\s+/gi,
    "se aprecia ",
  );

  // Caso: "Como puedes ver en la imagen," / "Como ves en la foto,"
  out = out.replace(
    /\b[Cc]omo\s+(?:puedes\s+ver|pod[eé]s\s+ver|ves|se\s+ve|se\s+observa)\s+en\s+(?:la|esta)\s+(?:imagen|fotograf[ií]a|foto|ilustraci[oó]n)(?:\s+adjunta)?\s*,?\s*/g,
    "",
  );

  // Caso: "Aquí tienes una imagen/fotografía/foto de ...:"
  out = out.replace(
    /\b[Aa]qu[ií]\s+(?:tienes|ten[eé]s|te\s+muestro|te\s+dejo)\s+(?:una|la)\s+(?:imagen|fotograf[ií]a|foto|ilustraci[oó]n)\b[^.!:\n]*[.!:\n]\s*/g,
    "",
  );

  out = out.trim();
  if (out.length > 0) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out || "...";
}

function extractLastUserPrompt(message: Message, historyForApi: Content[]): string {
  if (Array.isArray(historyForApi) && historyForApi.length > 0) {
    for (let i = historyForApi.length - 1; i >= 0; i--) {
      const turn = historyForApi[i];
      if (turn?.role === "user" && Array.isArray(turn.parts)) {
        for (let j = turn.parts.length - 1; j >= 0; j--) {
          const part = turn.parts[j] as any;
          if (part && typeof part.text === "string" && part.text.trim()) {
            return part.text
              .replace(/^\[[^\]]+\]:\s*/i, "")
              .replace(/^\([^)]+\):\s*/i, "")
              .trim();
          }
        }
      }
    }
  }
  if (message && typeof message.content === "string") {
    return message.content.replace(/<@!?[0-9]+>/g, "").trim();
  }
  return "";
}

export async function sendConversationReply(
  message: Message,
  systemInstruction: string,
  historyForApi: Content[],
  isDirectInteraction: boolean,
  safety: "relaxed" | "standard" | "strict",
  mode: string = "neko",
  enableGoogleSearch?: boolean,
  temperature?: number,
  statusMessage?: Message | null,
  minWaitMs: number = 0,
  statusType: StatusPhraseType = "default",
): Promise<ConversationReplyResult> {
  const shouldUseSearch =
    enableGoogleSearch !== undefined ? enableGoogleSearch : isDirectInteraction;
  const tools: GeminiTool[] = shouldUseSearch ? [{ googleSearch: {} }] : [];
  let stream;
  let fullText = "";
  let lastGroundingMetadata: any = null;

  const startTime = Date.now();
  let rotatorInterval: NodeJS.Timeout | null = null;

  // Iniciar rotación progresiva de etapas (labor illusion) cada 2000 ms si hay statusMessage y minWaitMs > 0
  if (statusMessage && typeof (statusMessage as any).edit === "function" && minWaitMs > 0) {
    let currentStep = 0;
    let previousPhrase = "";
    rotatorInterval = setInterval(async () => {
      try {
        currentStep++;
        let newEmbed;
        if (statusType === "research") {
          newEmbed = ConversationStatusManager.createProgressiveStatusEmbed(message.client?.user, currentStep);
        } else {
          const nextPhrase = ConversationStatusManager.getRotatingStatusPhrase(statusType, previousPhrase);
          previousPhrase = nextPhrase;
          newEmbed = ConversationStatusManager.createStatusEmbed(statusType, message.client?.user, nextPhrase);
        }
        await (statusMessage as any).edit({ embeds: [newEmbed] }).catch(() => null);
      } catch {}
    }, 2000);
  }

  async function consumeStream(s: AsyncIterable<any>): Promise<string> {
    let text = "";
    for await (const chunk of s) {
      if (chunk.candidates?.[0]?.finishReason === "SAFETY") {
        if (rotatorInterval) {
          clearInterval(rotatorInterval);
          rotatorInterval = null;
        }
        throw new Error("PROHIBITED_CONTENT");
      }
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
    stream = await generateResponseStream(
      systemInstruction,
      historyForApi,
      safety,
      tools,
      temperature !== undefined ? { temperature } : undefined,
    );
    fullText = await consumeStream(stream);
  } catch (toolErr: any) {
    if (toolErr?.message === "PROHIBITED_CONTENT") {
      if (rotatorInterval) {
        clearInterval(rotatorInterval);
        rotatorInterval = null;
      }
      throw toolErr;
    }

    if (tools.length > 0) {
      const errCode = toolErr?.status || toolErr?.code || "TOOL_SEARCH_ERROR";
      const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
      console.warn(`[AI/SearchFallback] Herramienta googleSearch falló (${errCode}: ${errMsg.slice(0, 100)}). Degradando a generación de texto puro.`);
      const degradedInstruction = `${systemInstruction}\n\n[SISTEMA INTERNO: La herramienta de búsqueda web en tiempo real no está disponible en este momento. Si la consulta requiere información en vivo, eventos recientes o datos que no recuerdas con certeza, comunícalo con honestidad y no inventes información reciente.]`;
      stream = await generateResponseStream(
        degradedInstruction,
        historyForApi,
        safety,
        [],
        temperature !== undefined ? { temperature } : undefined,
      );
      fullText = await consumeStream(stream);
    } else {
      if (rotatorInterval) {
        clearInterval(rotatorInterval);
        rotatorInterval = null;
      }
      throw toolErr;
    }
  }

  // Decisión de imagen integrada en una sola pasada: parsear tag [VISUAL_SEARCH: "..."]
  // con fallback determinista cuando el usuario pide explícitamente una imagen/fotografía.
  const parsed = VisualTagParser.parse(fullText);
  const cleanText = sanitizeReplyText(parsed.cleanText);
  const userPrompt = extractLastUserPrompt(message, historyForApi);

  let effectiveVisualQuery: string | null = null;
  if (userPrompt && ContextualImageService.isNonVisualPrompt(userPrompt)) {
    effectiveVisualQuery = null;
  } else if (parsed.visualQuery) {
    effectiveVisualQuery = parsed.visualQuery;
  } else if (userPrompt) {
    const fallbackVisual = ContextualImageService.shouldSearchImage(userPrompt);
    if (fallbackVisual.eligible && fallbackVisual.query) {
      effectiveVisualQuery = fallbackVisual.query;
    }
  }

  let imageResult = null;
  if (effectiveVisualQuery) {
    imageResult = await ContextualImageService.findContextualImage(effectiveVisualQuery, {
      isDirectQuery: true,
    }).catch(() => null);
  }

  // Si no se adjuntó ninguna imagen, neutralizar afirmaciones como "En la imagen estás viendo..."
  let finalText = imageResult ? cleanText : neutralizeFalseVisualClaims(cleanText);

  // Generar presentación directa con EmbedComposer (1 a 3 embeds sin paginación por defecto)
  const embeds = EmbedComposer.compose(finalText, {
    botUser: message.client?.user as any,
    imageResult,
  });

  // Esperar el tiempo restante del mínimo programado (ej. 7 segundos) antes de editar la respuesta
  if (statusMessage && minWaitMs > 0) {
    const elapsed = Date.now() - startTime;
    if (elapsed < minWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, minWaitMs - elapsed));
    }
  }

  if (rotatorInterval) {
    clearInterval(rotatorInterval);
    rotatorInterval = null;
  }

  let sent: Message | null = null;

  // Si existe un mensaje de espera previo, editarlo para transición instantánea sin mensajes duplicados
  if (statusMessage && typeof (statusMessage as any).edit === "function") {
    try {
      sent = (await (statusMessage as any).edit({ embeds })) as Message | null;
    } catch (editErr) {
      if (imageResult) {
        console.warn(
          "[AI/ConversationReply] Discord rechazó el embed con imagen al editar; reintentando edición solo con texto.",
          editErr,
        );
        finalText = neutralizeFalseVisualClaims(cleanText);
        const fallbackEmbeds = EmbedComposer.compose(finalText, {
          botUser: message.client?.user as any,
          imageResult: null,
        });
        sent = (await (statusMessage as any).edit({ embeds: fallbackEmbeds }).catch(() => null)) as Message | null;
      }
    }
  }

  // Fallback si no había statusMessage o falló la edición
  if (!sent && "reply" in message && typeof message.reply === "function") {
    try {
      sent = (await message.reply({ embeds })) as Message | null;
    } catch (replyErr) {
      if (imageResult) {
        console.warn(
          "[AI/ConversationReply] Discord rechazó el embed con imagen; reintentando envío solo con texto.",
          replyErr,
        );
        finalText = neutralizeFalseVisualClaims(cleanText);
        const fallbackEmbeds = EmbedComposer.compose(finalText, {
          botUser: message.client?.user as any,
          imageResult: null,
        });
        sent = (await message.reply({ embeds: fallbackEmbeds }).catch(() => null)) as Message | null;
      } else {
        sent = null;
      }
    }
  }

  if (sent?.id) {
    markAsAiMessage(sent.id);
  }

  // Auto-aprendizaje en segundo plano de palabras clave a partir de Google Search Grounding
  if (
    lastGroundingMetadata?.webSearchQueries &&
    Array.isArray(lastGroundingMetadata.webSearchQueries) &&
    lastGroundingMetadata.webSearchQueries.length > 0
  ) {
    const candidateTerms: string[] = [];
    for (const q of lastGroundingMetadata.webSearchQueries) {
      if (typeof q === "string" && q.trim()) {
        const cleaned = q
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleaned.length >= 3 && cleaned.length <= 35) {
          candidateTerms.push(cleaned);
        }
        const tokens = cleaned.split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
        for (const token of tokens) {
          if (token.length >= 3 && token.length <= 25) {
            candidateTerms.push(token);
          }
        }
      }
    }
    if (candidateTerms.length > 0) {
      DynamicKeywordRegistry.getInstance()
        .recordLearnedKeywords(candidateTerms, "general", "auto_discovered")
        .catch(() => null);
    }
  }

  return {
    fullText: finalText,
    groundingMetadata: lastGroundingMetadata,
  };
}
