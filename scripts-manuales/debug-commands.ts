import { REST, Routes } from "discord.js";
import { config } from "dotenv";
config();

const { TOKEN, BOT_ID, GUILD_ID } = process.env;

if (!TOKEN || !BOT_ID) process.exit(1);

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🕵️ Consultando a la API de Discord...\n");

    // 1. Ver comandos GLOBALES
    console.log("🌍 --- COMANDOS GLOBALES ---");
    const globalCommands = (await rest.get(
      Routes.applicationCommands(BOT_ID),
    )) as any[];

    if (globalCommands.length === 0) {
      console.log("❌ No hay comandos globales registrados.");
    } else {
      console.log(
        `✅ Se encontraron ${globalCommands.length} comandos globales:`,
      );
      globalCommands.forEach((cmd) =>
        console.log(`   - /${cmd.name} (ID: ${cmd.id})`),
      );
    }

    // 2. Ver comandos DE GUILD (Si tienes ID configurada)
    if (GUILD_ID) {
      console.log(`\n🏠 --- COMANDOS DE GUILD (${GUILD_ID}) ---`);
      const guildCommands = (await rest.get(
        Routes.applicationGuildCommands(BOT_ID, GUILD_ID),
      )) as any[];

      if (guildCommands.length === 0) {
        console.log("❌ No hay comandos en este servidor.");
      } else {
        console.log(
          `✅ Se encontraron ${guildCommands.length} comandos locales:`,
        );
        guildCommands.forEach((cmd) =>
          console.log(`   - /${cmd.name} (ID: ${cmd.id})`),
        );
      }
    }
  } catch (error) {
    console.error("💥 Error conectando con Discord:", error);
  }
})();
