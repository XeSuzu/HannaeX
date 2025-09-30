const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =========================================================================
// MEJORA: AÑADIMOS CONFIGURACIÓN Y UNA FUNCIÓN PARA STREAMING
// =========================================================================

// Función para generar respuesta (versión normal, no-stream)
async function generateResponse(prompt) {
  // AÑADIDO: Configuración para limitar la respuesta y acelerar la generación.
  const generationConfig = {
    maxOutputTokens: 512, // Límite de tokens para respuestas más rápidas
  };

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig, // Se aplica la configuración
  });

  return result.response.text();
}

// NUEVO: Función para generar la respuesta en tiempo real (streaming)
async function generateResponseStream(prompt) {
    const generationConfig = {
      maxOutputTokens: 1024, // Damos un poco más de margen para el stream
    };
    
    // Usamos generateContentStream en lugar de generateContent
    const result = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
    });
    
    return result.stream; // Devolvemos el "stream" para procesarlo en messageCreate
}

// Tu función para dividir mensajes se mantiene, ¡es muy buena!
function splitMessage(text, maxLength = 2000) {
  const regex = new RegExp(`(.|\\s){1,${maxLength}}(?=\\s|$)`, "g");
  return text.match(regex) || [];
}

// Exportamos la nueva función junto a las existentes
module.exports = { generateResponse, splitMessage, generateResponseStream };