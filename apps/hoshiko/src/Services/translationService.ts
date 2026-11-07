import { AiClientService } from "../Core/AI/Client/AiClientService";

export const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese",
};

export interface TranslationResult {
  detectedLang: string;
  translation: string;
}

/**
 * Traduce un texto al idioma destino consolidando la detección y la traducción
 * en una única llamada unificada a través de AiClientService (Gemini Relay).
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  _apiKey?: string,
): Promise<TranslationResult> {
  const prompt = `You are a professional translator. Analyze the input text, detect its original language, and translate it accurately to ${targetLanguage}.
Respond ONLY with a valid JSON object with keys "detectedLang" (the detected language name in English) and "translation" (the translated text in ${targetLanguage}). Do NOT wrap with markdown code blocks.

Input text:
${text}`;

  const aiClient = AiClientService.getInstance();
  const rawResponse = await aiClient.generateText({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    temperature: 0.2,
    maxOutputTokens: 2048,
    signal:
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(15000)
        : undefined,
  });

  const clean = (rawResponse || "").replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(clean);
    return {
      detectedLang: parsed.detectedLang || "Desconocido",
      translation: parsed.translation || clean,
    };
  } catch {
    return {
      detectedLang: "Auto",
      translation: clean,
    };
  }
}
