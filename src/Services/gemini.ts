import {
  Content,
  GenerateContentStreamResult,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
  Tool,
} from "@google/generative-ai";
import { GEMINI_MODEL_FLASH_LITE } from "../config/aiModels";

export interface GoogleSearchTool {
  googleSearch: Record<string, unknown>;
}

export type GeminiTool = Tool | GoogleSearchTool;

export function sanitizeToolsForGemini25(tools?: GeminiTool[]): Tool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t: any) => {
    if (t && typeof t === "object" && "googleSearchRetrieval" in t) {
      const { googleSearchRetrieval, ...rest } = t;
      return { googleSearch: {}, ...rest };
    }
    return t;
  }) as Tool[];
}

export function sanitizeContentsForGemini(rawHistory: Content[]): Content[] {
  if (!rawHistory || rawHistory.length === 0) {
    return [{ role: "user", parts: [{ text: "..." }] }];
  }

  // 1. Filtrar elementos inválidos o sin parts
  const valid = rawHistory.filter(
    (item) => item && item.parts && Array.isArray(item.parts) && item.parts.length > 0,
  );

  if (valid.length === 0) {
    return [{ role: "user", parts: [{ text: "..." }] }];
  }

  // 2. Eliminar modelos huérfanos al inicio (Gemini exige empezar en 'user')
  while (valid.length > 0 && valid[0].role === "model") {
    valid.shift();
  }

  if (valid.length === 0) {
    return [{ role: "user", parts: [{ text: "..." }] }];
  }

  // 3. Fusionar turnos consecutivos del mismo rol para garantizar alternancia estricta (user -> model -> user)
  const merged: Content[] = [];
  for (const item of valid) {
    const role: "user" | "model" = item.role === "model" ? "model" : "user";
    if (merged.length > 0 && merged[merged.length - 1].role === role) {
      merged[merged.length - 1].parts.push(...item.parts);
    } else {
      merged.push({ role, parts: [...item.parts] });
    }
  }

  // 4. El último turno debe ser 'user'
  while (merged.length > 0 && merged[merged.length - 1].role === "model") {
    merged.pop();
  }

  if (merged.length === 0) {
    return [{ role: "user", parts: [{ text: "..." }] }];
  }

  return merged;
}

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta la variable de entorno GEMINI_API_KEY.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateResponseStream(
  systemInstruction: string,
  history: Content[],
  safetyLevel: "relaxed" | "standard" | "strict" = "standard",
  tools?: GeminiTool[],
): Promise<GenerateContentStreamResult["stream"]> {
  const safetySettings: SafetySetting[] = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold:
        safetyLevel === "relaxed"
          ? HarmBlockThreshold.BLOCK_NONE
          : safetyLevel === "strict"
            ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
            : HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold:
        safetyLevel === "relaxed"
          ? HarmBlockThreshold.BLOCK_NONE
          : safetyLevel === "strict"
            ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
            : HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold:
        safetyLevel === "relaxed"
          ? HarmBlockThreshold.BLOCK_NONE
          : safetyLevel === "strict"
            ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
            : HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold:
        safetyLevel === "relaxed"
          ? HarmBlockThreshold.BLOCK_NONE
          : safetyLevel === "strict"
            ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
            : HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const sanitizedTools = sanitizeToolsForGemini25(tools);
    const sanitizedContents = sanitizeContentsForGemini(history);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_FLASH_LITE,
      safetySettings,
      systemInstruction: systemInstruction,
      ...(sanitizedTools && sanitizedTools.length > 0 && { tools: sanitizedTools }),
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    const result = await model.generateContentStream(
      { contents: sanitizedContents },
      { signal: controller.signal },
    );

    clearTimeout(timeout);
    return result.stream;
  } catch (err: any) {
    clearTimeout(timeout);

    if (
      err.message?.includes("SAFETY") ||
      err.message?.includes("blocked") ||
      err.response
    ) {
      console.log("\n🚨 --- REPORTE DE BLOQUEO DE SEGURIDAD --- 🚨");
      console.log(`🎚️ Nivel configurado: [${safetyLevel.toUpperCase()}]`);
      if (err.response?.promptFeedback) {
        console.log(
          "🔍 Feedback del Prompt:",
          JSON.stringify(err.response.promptFeedback, null, 2),
        );
      }
      if (err.response?.candidates && err.response.candidates.length > 0) {
        const candidate = err.response.candidates[0];
        console.log("🚫 Razón de bloqueo:", candidate.finishReason);
        if (candidate.safetyRatings) {
          console.log("🛡️ Ratings Culpables:");
          candidate.safetyRatings.forEach((rating: any) => {
            if (rating.probability !== "NEGLIGIBLE") {
              console.log(`   👉 ${rating.category}: ${rating.probability}`);
            }
          });
        }
      }
      console.log("----------------------------------\n");
      throw new Error("PROHIBITED_CONTENT");
    }

    if (err.name === "AbortError") {
      console.error(
        `[GEMINI] ⏱️ Timeout: La respuesta tardó más de 30 segundos`,
      );
      throw new Error("TIMEOUT_ERROR");
    }

    const errStatus = err?.status || err?.code || "";
    const errDetails = err?.errorDetails ? ` | Detalles: ${JSON.stringify(err.errorDetails)}` : "";
    console.error(`⚠️ [GEMINI] Error inesperado (${errStatus}):`, err.message, errDetails);
    throw err;
  }
}

export async function extractFacts(
  username: string,
  userMessage: string,
  userId?: string,
): Promise<string[]> {
  if (!userMessage || userMessage.trim().length < 5) return [];

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_FLASH_LITE,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    });

    const prompt = `
Analiza el mensaje de un usuario de Discord llamado "${username}" y extrae información útil para personalizar futuras respuestas.

EXTRAE cualquiera de estos tipos:
- Datos personales: nombre real, edad, país, idioma
- Gustos y hobbies: música, anime, juegos, deportes, etc.
- Trabajo/estudios: profesión, carrera, habilidades
- Preferencias de conversación: si prefiere respuestas cortas, si le gusta el humor, si es directo
- Estado emocional recurrente: si menciona estar estresado seguido, si suele estar de buen humor, etc.
- Temas que le importan o menciona frecuentemente

REGLAS:
- Solo hechos concretos y útiles para futuras conversaciones
- NO extraigas saludos, preguntas genéricas ni comentarios del momento sin valor futuro
- Si no hay nada relevante, responde exactamente: []
- Responde SOLO con un array JSON de strings, sin markdown ni explicaciones
- Máximo 3 facts por mensaje

Ejemplos válidos:
- "Le gusta el anime de mechas"
- "Prefiere respuestas cortas y directas"
- "Está aprendiendo programación en TypeScript"
- "Suele estar activo de noche"
- "Tiene sentido del humor sarcástico"
- "Le molesta cuando le explican cosas que ya sabe"

Mensaje:
"${userMessage}"

Respuesta (solo array JSON):
    `.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f: any) => typeof f === "string" && f.trim().length > 0,
    );
  } catch (err) {
    console.warn("[GEMINI] ⚠️ No se pudieron extraer facts:", err);
    return [];
  }
}
