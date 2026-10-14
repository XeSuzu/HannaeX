require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Esta función probará la conexión más básica posible
async function runTest() {
  try {
    // 1. Verificamos que la clave de API se esté cargando
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "¡ERROR! No se encontró la GEMINI_API_KEY en tu archivo .env",
      );
      return;
    }
    console.log("Clave de API encontrada. Inicializando cliente de Google...");

    // 2. Intentamos inicializar el cliente
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log(
      "Cliente inicializado. Intentando generar contenido de prueba...",
    );

    // 3. Hacemos la llamada más simple a la API
    const prompt = "Hola mundo";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 4. Si todo sale bien, mostramos el éxito
    console.log("\n=============================================");
    console.log("✅ ¡CONEXIÓN EXITOSA!");
    console.log("Respuesta de Gemini: ", text);
    console.log("=============================================");
  } catch (error) {
    // 5. Si algo falla, mostramos el error detallado
    console.error("\n=============================================");
    console.error("❌ ¡FALLÓ LA CONEXIÓN CON GEMINI!");
    console.error("=============================================");
    console.error(error);
  }
}

runTest();
