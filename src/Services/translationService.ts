import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_FLASH } from "../config/aiModels";

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

export async function translateText(
  text: string,
  targetLanguage: string,
  apiKey: string,
): Promise<TranslationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_FLASH });

  const detectPrompt = `Detect the language of this text and respond with ONLY the language name in English (e.g., Spanish, English, French):\n\n${text}`;
  const detectResult = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: detectPrompt }] }],
  });
  const detectedLang = detectResult.response.text().trim();

  const prompt = `Translate the following text to ${targetLanguage}. Respond with ONLY the translated text, nothing else:\n\n${text}`;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return {
    detectedLang,
    translation: result.response.text(),
  };
}
