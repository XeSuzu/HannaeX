import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentStreamResult,
  SafetySetting,
  Content,
  Tool,
} from "@google/generative-ai";

// Verificación de API Key
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta la variable de entorno GEMINI_API_KEY.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Genera una respuesta en streaming con filtros optimizados 🚀
 */
export async function generateResponseStream(
  systemInstruction: string,
  history: Content[],
  safetyLevel: "relaxed" | "standard" | "strict" = "standard",
): Promise<GenerateContentStreamResult["stream"]> {
  // 🛡️ MAPEO DE SEGURIDAD ROBUSTO
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      safetySettings,
      systemInstruction: systemInstruction,

      tools: [
        { google_search: {} } as unknown as Tool,
      ],

      generationConfig: {
        temperature: 0.7, // ✅ Ajustado ligeramente para mayor precisión técnica
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096, // ✅ ¡El tanque de oxígeno!
      },
    });

    // 1. Separamos el historial previo del mensaje actual
    let chatHistory = history.slice(0, -1);

    // 2. Google exige que el historial empiece con 'user'.
    while (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.shift();
    }

    const chat = model.startChat({
      history: chatHistory,
    });

    const lastMessage = history[history.length - 1]?.parts[0]?.text || "";

    const result = await chat.sendMessageStream(lastMessage, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return result.stream;
  } catch (err: any) {
    clearTimeout(timeout);

    // 🕵️ REPORTE FORENSE DE CENSURA INTEGRADO 🕵️
    if (
      err.message?.includes("SAFETY") ||
      err.message?.includes("blocked") ||
      err.response
    ) {
      console.log("\n🚨 --- REPORTE DE BLOQUEO DE SEGURIDAD --- 🚨");
      console.log(`🎚️ Nivel configurado: [${safetyLevel.toUpperCase()}]`);

      if (err.response?.promptFeedback) {
        console.log("🔍 Feedback del Prompt:", JSON.stringify(err.response.promptFeedback, null, 2));
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
      console.error(`[GEMINI] ⏱️ Timeout: La respuesta tardó más de 30 segundos`);
      throw new Error("TIMEOUT_ERROR");
    }

    console.error("⚠️ [GEMINI] Error inesperado:", err.message);
    throw err;
  }
}

/**
 * Extrae facts relevantes del mensaje de un usuario para memoria persistente.
 * Devuelve un array de strings con los facts encontrados, o vacío si no hay nada relevante.
 */
export async function extractFacts(
  username: string,
  userMessage: string,
  userId?: string,
): Promise<string[]> {
  if (!userMessage || userMessage.trim().length < 5) return [];

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.1, // Muy bajo — queremos respuestas deterministas
        maxOutputTokens: 256,
      },
    });

    const prompt = `
Analiza el siguiente mensaje de un usuario de Discord llamado "${username}" y extrae ÚNICAMENTE información personal relevante y duradera sobre él.

REGLAS ESTRICTAS:
- Solo extrae hechos concretos: gustos, preferencias, nombre real, edad, idioma, hobbies, trabajo, etc.
- NO extraigas preguntas, saludos, opiniones temporales ni comentarios del momento.
- Si no hay nada relevante, responde exactamente: []
- Responde SOLO con un array JSON de strings. Sin explicaciones. Sin markdown.

Ejemplos de facts válidos:
- "Le gusta el anime de mechas"
- "Su nombre real es Carlos"
- "Trabaja como programador"
- "Prefiere respuestas cortas"

Mensaje del usuario:
"${userMessage}"

Respuesta (solo el array JSON):
    `.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Limpiamos posibles backticks que Gemini añada
    const clean = text.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((f: any) => typeof f === "string" && f.trim().length > 0);
  } catch (err) {
    // Si falla la extracción, no bloqueamos nada — simplemente no guardamos facts
    console.warn("[GEMINI] ⚠️ No se pudieron extraer facts:", err);
    return [];
  }
}