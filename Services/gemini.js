/**
 * Servicio de integración con Google Gemini AI para generación de texto.
 * Proporciona funciones para obtener respuestas normales y en streaming.
 * 
 * Requiere la variable de entorno GEMINI_API_KEY.
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require("dotenv").config();

// ========================= 🔑 Inicialización del modelo =========================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta la variable de entorno GEMINI_API_KEY.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuración de seguridad básica para evitar contenido inapropiado
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// Modelo seleccionado (puedes cambiarlo por "gemini-1.5-pro" si necesitas más profundidad)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  safetySettings,
});

// ========================= 🧠 Funciones principales =========================

/**
 * Genera una respuesta completa a partir de un prompt usando Gemini AI.
 * @param {string} prompt - El texto de entrada para la IA.
 * @returns {Promise<string>} - La respuesta generada por la IA.
 */
async function generateResponse(prompt) {
  try {
    const generationConfig = { maxOutputTokens: 512 };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    return result.response.text() || "Nyaa… no tengo respuesta esta vez 🐾";
  } catch (err) {
    console.error("⚠️ Error al generar respuesta:", err);
    throw err;
  }
}

/**
 * Genera una respuesta en streaming (tiempo real) a partir de un prompt.
 * Permite mostrar la respuesta progresivamente en el chat.
 * @param {string} prompt - El texto de entrada para la IA.
 * @returns {Promise<AsyncIterable<{text: () => string}>>} - Un stream de fragmentos de texto.
 */
async function generateResponseStream(prompt) {
  try {
    const generationConfig = { maxOutputTokens: 1024 };

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    return result.stream;
  } catch (err) {
    console.error("⚠️ Error al generar respuesta en streaming:", err);
    throw err;
  }
}

/**
 * Divide un texto largo en partes más pequeñas, respetando el límite de Discord.
 * @param {string} text - El texto a dividir.
 * @param {number} [maxLength=2000] - Longitud máxima de cada parte.
 * @returns {string[]} - Array de fragmentos de texto.
 */
function splitMessage(text, maxLength = 2000) {
  const regex = new RegExp(`(.|\\s){1,${maxLength}}(?=\\s|$)`, "g");
  return text.match(regex) || [];
}

// ========================= 📦 Exportación =========================
module.exports = { generateResponse, generateResponseStream, splitMessage, model };
