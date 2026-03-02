import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carga el .env correcto según la variable NODE_ENV.
const nodeEnv = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });

const { TOKEN, BOT_ID, GUILD_ID, GUILD_IDS } = process.env;
const isGlobal = process.argv.includes("--global");

if (!TOKEN || !BOT_ID) {
  console.error("❌ Missing TOKEN or BOT_ID in environment variables.");
  throw new Error("Missing TOKEN or BOT_ID in environment variables.");
}

const guildIds: string[] = (() => {
  if (GUILD_IDS) {
    try {
      const trimmed = GUILD_IDS.trim();
      if (trimmed.startsWith("[")) return JSON.parse(trimmed);
      return trimmed.split(",").map(s => s.trim()).filter(Boolean);
    } catch {
      return GUILD_IDS.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return GUILD_ID ? [GUILD_ID] : [];
})();

const commandsPath = path.resolve(process.cwd(), "dist/Commands/SlashCmds");
const publicCommands: any[] = [];
const privateCommands: any[] = [];

function validate(cmd: any) {
  if (!cmd?.name || !cmd?.description) return false;
  if (cmd.name.length > 32) return false;
  if (cmd.description.length > 100) return false;
  if (cmd.options?.length > 25) return false;
  if (JSON.stringify(cmd).length > 4000) return false;
  return true;
}

function load(dir: string) {
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      load(fullPath);
      continue;
    }

    if (!file.name.endsWith(".js")) continue;

    try {
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      const cmd = mod.default || mod;

      if (!cmd?.data) continue;

      let data = cmd.data;
      if (typeof data.toJSON === "function") data = data.toJSON();
      if (!validate(data)) continue;

      const isPrivate = cmd.devOnly === true || cmd.category === "Owner";
      isPrivate ? privateCommands.push(data) : publicCommands.push(data);

    } catch (err: any) {
      console.error(`⚠️ Failed loading ${file.name}:`, err.message);
    }
  }
}

function logSection(title: string) {
  console.log("\n──────────────");
  console.log(title);
  console.log("──────────────");
}

async function deploy() {
  const api = axios.create({
    baseURL: "https://discord.com/api/v10",
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
    },
    timeout: 120000,
  });

  try {
    logSection("🐾 Starting deployment...");

    load(commandsPath);

    if (!publicCommands.length && !privateCommands.length) {
      throw new Error("No valid commands found.");
    }

    console.log(`Public: ${publicCommands.length}`);
    console.log(`Private: ${privateCommands.length}`);

    if (isGlobal) {
      logSection("🌍 Global mode");

      if (publicCommands.length) {
        await api.put(`/applications/${BOT_ID}/commands`, publicCommands);
        console.log(`✔ Global public commands synced.`);
      }

      if (guildIds.length && privateCommands.length) {
        for (const id of guildIds) {
          await api.put(
            `/applications/${BOT_ID}/guilds/${id}/commands`,
            privateCommands
          );
          console.log(`✔ Private commands synced in ${id}.`);
        }
      }

    } else {
      if (!guildIds.length) {
        throw new Error("No GUILD_ID or GUILD_IDS configured for Guild mode.");
      }

      logSection("🏠 Guild mode");

      const all = [...publicCommands, ...privateCommands];

      for (const id of guildIds) {
        await api.put(
          `/applications/${BOT_ID}/guilds/${id}/commands`,
          all
        );
        console.log(`✔ Commands synced in ${id}.`);
      }
    }

    logSection("✨ Deployment completed successfully.");
    // No usamos process.exit(0), dejamos que el script termine naturalmente.

  } catch (err: any) {
    logSection("❌ Deployment failed");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Message:", err.response.data?.message);
      console.error(
        "Details:",
        JSON.stringify(err.response.data?.errors, null, 2)
      );

      if (err.response.status === 429) {
        const retryAfter = err.response.data?.retry_after || 60;
        console.error(`⏳ Rate limited. Retry after ~${Math.ceil(retryAfter)} seconds.`);
      }

    } else {
      console.error("Error:", err.message);
    }

    console.error("The neko stumbled… but she'll recover. 🐾");
    // Lanzar el error permite que el script de npm falle, lo cual es correcto.
    throw err;
  }
}

// Ejecutamos la función y si falla, nos aseguramos de que el proceso termine con un código de error.
deploy().catch(() => process.exit(1));