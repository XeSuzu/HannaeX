import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "path";

// 1. CARGA INTELIGENTE DEL .ENV
// Intentamos cargar desde la raíz donde ejecutas el comando (la forma más segura)
dotenv.config({ path: path.join(process.cwd(), ".env") });

const { TOKEN, BOT_ID, GUILD_ID } = process.env;

// 2. DIAGNÓSTICO (Para ver qué está pasando)
console.log(`📂 Directorio de ejecución: ${process.cwd()}`);
// Solo mostramos los primeros caracteres por seguridad
console.log(`🔑 Token leído: ${TOKEN ? "✅ (Ok)" : "❌ (Vacío/Undefined)"}`);
console.log(
  `🆔 Client ID leído: ${BOT_ID ? "✅ (Ok)" : "❌ (Vacío/Undefined)"}`,
);

// 3. VALIDACIÓN
if (!TOKEN || !BOT_ID) {
  console.error("\n❌ ERROR: Las variables siguen sin aparecer.");
  console.error(
    "👉 Verifica que el archivo se llame exactamente '.env' (sin nombre antes del punto).",
  );
  console.error(
    "👉 Verifica que estés ejecutando el comando desde la carpeta raíz del proyecto (HannaeX).",
  );
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("\n🧹 [Hoshiko Cleaner] Iniciando limpieza...");

    // Borrar GUILD (Si existe ID)
    if (GUILD_ID) {
      console.log(`🔹 Borrando comandos del servidor local (${GUILD_ID})...`);
      await rest.put(Routes.applicationGuildCommands(BOT_ID, GUILD_ID), {
        body: [],
      });
      console.log("✅ Local limpio.");
    }

    // Borrar GLOBAL
    console.log("🔹 Borrando comandos Globales...");
    await rest.put(Routes.applicationCommands(BOT_ID), { body: [] });
    console.log("✅ Global limpio.");

    console.log('\n✨ ¡TODO LIMPIO! Ahora ejecuta "npm run deploy:global"');
  } catch (error) {
    console.error("❌ Error de Discord API:", error);
  }
})();
