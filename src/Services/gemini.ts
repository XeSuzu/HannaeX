import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerateContentStreamResult,
    SafetySetting,
    Content
} from '@google/generative-ai';
import 'dotenv/config';

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
    safetyLevel: 'relaxed' | 'standard' | 'strict' = 'standard'
): Promise<GenerateContentStreamResult['stream']> {
    
    // 🛡️ MAPEO DE SEGURIDAD ROBUSTO
    const safetySettings: SafetySetting[] = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: safetyLevel === 'relaxed' ? HarmBlockThreshold.BLOCK_NONE : 
                       safetyLevel === 'strict' ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE : HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: safetyLevel === 'relaxed' ? HarmBlockThreshold.BLOCK_NONE : 
                       safetyLevel === 'strict' ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE : HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: safetyLevel === 'relaxed' ? HarmBlockThreshold.BLOCK_NONE : 
                       safetyLevel === 'strict' ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE : HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: safetyLevel === 'relaxed' ? HarmBlockThreshold.BLOCK_NONE : 
                       safetyLevel === 'strict' ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE : HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
    ];

    const controller = new AbortController();
    // Aumentamos a 30s para evitar cortes en respuestas largas
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", // ⚡ Mantenido tal cual pediste
            safetySettings,
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            }
        });

        // ---------------------------------------------------------
        // 🚑 FIX DE HISTORIAL: Limpieza de mensajes iniciales
        // ---------------------------------------------------------
        
        // 1. Separamos el historial previo del mensaje actual
        let chatHistory = history.slice(0, -1);

        // 2. Google exige que el historial empiece con 'user'. 
        // Si el primer mensaje es del bot ('model'), lo borramos hasta encontrar un usuario.
        while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
            chatHistory.shift(); 
        }

        // 🧠 Iniciamos chat para mantener el contexto correctamente
        const chat = model.startChat({
            history: chatHistory,
        });

        // Obtenemos el último mensaje (el prompt actual del usuario)
        const lastMessage = history[history.length - 1]?.parts[0]?.text || "";
        
        // Enviamos el mensaje
        const result = await chat.sendMessageStream(lastMessage, { signal: controller.signal });

        clearTimeout(timeout);
        return result.stream;

    } catch (err: any) {
        clearTimeout(timeout);
        
        // 🕵️ REPORTE FORENSE DE CENSURA INTEGRADO 🕵️
        if (err.message?.includes('SAFETY') || err.message?.includes('blocked') || err.response) {
            console.log("\n🚨 --- REPORTE DE BLOQUEO --- 🚨");
            console.log(`🎚️ Nivel configurado: [${safetyLevel.toUpperCase()}]`);
            
            // 1. ¿Fue culpa del mensaje del Usuario?
            if (err.response?.promptFeedback) {
                console.log("🔍 Feedback del Prompt:", JSON.stringify(err.response.promptFeedback, null, 2));
            }

            // 2. ¿Fue culpa de la respuesta de la IA?
            if (err.response?.candidates && err.response.candidates.length > 0) {
                const candidate = err.response.candidates[0];
                console.log("🚫 Razón de bloqueo:", candidate.finishReason);
                
                if (candidate.safetyRatings) {
                    console.log("🛡️ Ratings Culpables:");
                    candidate.safetyRatings.forEach((rating: any) => {
                        if (rating.probability !== 'NEGLIGIBLE') {
                            console.log(`   👉 ${rating.category}: ${rating.probability}`);
                        }
                    });
                }
            }
            console.log("----------------------------------\n");
            
            throw new Error("PROHIBITED_CONTENT");
        }

        if (err.name === 'AbortError') {
            throw new Error("TIMEOUT_ERROR");
        }
        
        console.error("⚠️ [Gemini Service Error]:", err.message);
        throw err;
    }
}