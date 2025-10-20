import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerateContentStreamResult,
    SafetySetting,
    Content
} from '@google/generative-ai';
import 'dotenv/config';

// --- Inicialización del cliente (se mantiene igual) ---
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Falta la variable de entorno GEMINI_API_KEY.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const safetySettings: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

/**
 * Genera una respuesta en streaming a partir de instrucciones y un historial, con un timeout.
 * @param systemInstruction Las instrucciones de personalidad para la IA.
 * @param history El historial de la conversación.
 * @returns Un stream de fragmentos de texto.
 */
export async function generateResponseStream(
    systemInstruction: string,
    history: Content[]
): Promise<GenerateContentStreamResult['stream']> {
    // ✨ MEJORA: Añadimos un AbortController para el timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 segundos de tiempo de espera

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            safetySettings,
            systemInstruction: systemInstruction,
        });

        const result = await model.generateContentStream(
            { contents: history },
            { signal: controller.signal } // Pasamos la señal de abortar
        );

        // Si la petición tiene éxito, limpiamos el timeout para que no se ejecute
        clearTimeout(timeout);

        return result.stream;
    } catch (err: any) {
        // Limpiamos el timeout también si hay un error antes de que se complete
        clearTimeout(timeout);
        
        // Si el error fue por el timeout, lo especificamos en la consola y lanzamos un error claro.
        if (err.name === 'AbortError') {
            console.error("⚠️ Error: La petición a Gemini tardó demasiado (timeout).");
            throw new Error("La petición a Gemini tardó demasiado (timeout).");
        }
        
        console.error("⚠️ Error al generar respuesta en streaming:", err.message);
        throw err;
    }
}