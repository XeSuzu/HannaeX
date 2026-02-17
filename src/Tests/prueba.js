require("dotenv").config();
const { REST, Routes } = require("discord.js");

const TOKEN = process.env.TOKEN;
const BOT_ID = process.env.BOT_ID;

console.log("🔍 --- DIAGNÓSTICO DE CREDENCIALES ---");
console.log(
  `🔑 Token (primeros 5 chars): ${TOKEN ? TOKEN.substring(0, 5) + "..." : "FALTA"}`,
);
console.log(`🆔 Bot ID: ${BOT_ID || "FALTA"}`);

if (!TOKEN || !BOT_ID) {
  console.error("❌ ERROR: Faltan datos en el .env");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("📡 Intentando conectar con Discord...");

    // Intentamos subir 1 comando tonto para ver si responde
    await rest.put(Routes.applicationCommands(BOT_ID), {
      body: [{ name: "test", description: "Prueba de conexión" }],
    });

    console.log("✅ ¡CONEXIÓN EXITOSA! Las credenciales están bien.");
    console.log(
      "👉 El problema estaba en el otro script (bucle infinito o archivo corrupto).",
    );
  } catch (error) {
    console.error("\n❌ ERROR DE CONEXIÓN:");
    if (error.status === 401) {
      console.error(
        "🚫 401 UNAUTHORIZED: El Token está mal o no pertenece a este Bot ID.",
      );
    } else if (error.status === 403) {
      console.error(
        "🚫 403 FORBIDDEN: El bot ID está mal o no tienes permisos.",
      );
    } else if (error.status === 404) {
      console.error(
        "🚫 404 NOT FOUND: La ID del Bot (Application ID) es incorrecta.",
      );
    } else {
      console.error(error);
    }
  }
})();
