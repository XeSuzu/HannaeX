import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerateContentStreamResult,
    SafetySetting,
    Content
} from '@google/generative-ai';
import 'dotenv/config';

// --- Inicialización del cliente ---
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
 * Genera una respuesta en streaming 🚀
 * @param systemInstruction Instrucciones de personalidad.
 * @param history Historial de la conversación (que ya debe incluir el mensaje actual).
 */
export async function generateResponseStream(
    systemInstruction: string,
    history: Content[]
): Promise<GenerateContentStreamResult['stream']> {
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // Subimos a 20s por si la respuesta es larga ⏳

    try {
        const model = genAI.getGenerativeModel({
            // ✨ TIP: Cambia a "gemini-1.5-flash" si el 2.5 te da problemas de cuota
            model: "gemini-2.5-flash", 
            safetySettings,
            systemInstruction: systemInstruction,
        });

        // Enviamos el historial completo que armamos en el aiHandler
        const result = await model.generateContentStream(
            { contents: history },
            { signal: controller.signal }
        );

        clearTimeout(timeout);
        return result.stream;

    } catch (err: any) {
        clearTimeout(timeout);
        
        if (err.name === 'AbortError') {
            console.error("⚠️ La petición a Gemini excedió el tiempo límite.");
            throw new Error("Timeout: La IA tardó demasiado en responder nya~ 😿");
        }
        
        console.error("⚠️ Error en el servicio Gemini:", err.message);
        throw err;
    }
}