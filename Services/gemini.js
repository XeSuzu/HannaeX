const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Divide los mensajes largos en partes (máx 2000 chars)
function splitMessage(text, maxLength = 2000) {
    const regex = new RegExp(`(.|\\s){1,${maxLength}}(?=\\s|$)`, 'g');
    return text.match(regex) || [];
}

// Función para generar respuesta con Gemini
async function generateResponse(prompt) {
    const result = await model.generateContent(prompt);
    return result.response.text();
}

module.exports = { generateResponse, splitMessage };
