import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerateContentStreamResult,
    SafetySetting
} from '@google/generative-ai';
import 'dotenv/config';

// ========================= 🔑 Inicialización del modelo =========================

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Falta la variable de entorno GEMINI_API_KEY.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Le damos un tipo explícito a la configuración de seguridad
const safetySettings: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// Modelo seleccionado. "gemini-1.5-flash-latest" es una opción moderna y rápida.
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
});

// ========================= 🧠 Funciones principales =========================

/**
 * Genera una respuesta completa a partir de un prompt usando Gemini AI.
 * @param prompt El texto de entrada para la IA.
 * @returns La respuesta generada por la IA.
 */
export async function generateResponse(prompt: string): Promise<string> {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text() || "Nyaa… no tengo respuesta esta vez 🐾";
    } catch (err: any) {
        console.error("⚠️ Error al generar respuesta:", err.message);
        throw err;
    }
}

/**
 * Genera una respuesta en streaming (tiempo real) a partir de un prompt.
 * @param prompt El texto de entrada para la IA.
 * @returns Un stream de fragmentos de texto.
 */
export async function generateResponseStream(prompt: string): Promise<GenerateContentStreamResult['stream']> {
    try {
        const result = await model.generateContentStream(prompt);
        return result.stream;
    } catch (err: any) {
        console.error("⚠️ Error al generar respuesta en streaming:", err.message);
        throw err;
    }
}

/**
 * Divide un texto largo en partes más pequeñas, respetando el límite de Discord.
 * @param text El texto a dividir.
 * @param maxLength Longitud máxima de cada parte.
 * @returns Array de fragmentos de texto.
 */
export function splitMessage(text: string, maxLength: number = 2000): string[] {
    const regex = new RegExp(`(.|\\s){1,${maxLength}}(?=\\s|$)`, "g");
    return text.match(regex) || [];
}

// También podemos exportar el modelo si es necesario en otras partes del bot
export { model };