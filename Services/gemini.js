/**
 * Servicio de integración con Google Gemini AI para generación de texto.
 * Proporciona funciones para obtener respuestas normales y en streaming.
 * 
 * Requiere la variable de entorno GEMINI_API_KEY.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Inicializa la instancia de Gemini AI usando la API Key del entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Selecciona el modelo a utilizar (puedes cambiar el modelo aquí si lo deseas)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Genera una respuesta completa a partir de un prompt usando Gemini AI.
 * @param {string} prompt - El texto de entrada para la IA.
 * @returns {Promise<string>} - La respuesta generada por la IA.
 */
async function generateResponse(prompt) {
  // Configuración para limitar la longitud de la respuesta y acelerar la generación
  const generationConfig = {
    maxOutputTokens: 512,
  };

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  return result.response.text();
}

/**
 * Genera una respuesta en streaming (tiempo real) a partir de un prompt.
 * Permite mostrar la respuesta progresivamente en el chat.
 * @param {string} prompt - El texto de entrada para la IA.
 * @returns {Promise<AsyncIterable<{text: () => string}>>} - Un stream de fragmentos de texto.
 */
async function generateResponseStream(prompt) {
  const generationConfig = {
    maxOutputTokens: 1024,
  };

  // Usamos la función de streaming del modelo
  const result = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  return result.stream; // Devuelve el stream para procesar en tiempo real
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

// Exporta las funciones para uso externo
module.exports = { generateResponse, splitMessage, generateResponseStream };