import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";

const TOKEN = process.env.TOKEN;
const BOT_ID = process.env.BOT_ID;
const GUILD_ID = process.env.GUILD_ID;

const isGlobalDeploy = process.argv.includes("--global");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

if (!TOKEN || !BOT_ID) {
  console.error(`${COLORS.red}Falta TOKEN o BOT_ID${COLORS.reset}`);
  process.exit(1);
}

const distPath = path.resolve(process.cwd(), "dist/Commands/SlashCmds");
const commandsPublic: any[] = [];
const commandsPrivate: any[] = [];

function loadCommands(dir: string) {
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!file.name.endsWith(".js")) continue;

    try {
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      const cmd = mod.default || mod;

      if (!cmd?.data) continue;

      let data = cmd.data;
      if (typeof data.toJSON === "function") {
        data = data.toJSON();
      }

      const isPrivate = cmd.devOnly === true || cmd.category === "Owner";
      isPrivate ? commandsPrivate.push(data) : commandsPublic.push(data);

      console.log(`${COLORS.green}✔${COLORS.reset} ${data.name}`);
    } catch (err) {
      console.error(
        `${COLORS.red}💥 Error${COLORS.reset}:`,
        (err as any).message,
      );
    }
  }
}

console.log(`${COLORS.cyan}--- DEPLOYER PRO MAX (AXIOS) ---${COLORS.reset}\n`);

console.log(`${COLORS.yellow}Leyendo comandos...${COLORS.reset}`);
loadCommands(distPath);

console.log(`\n${COLORS.cyan}Públicos:${COLORS.reset}`, commandsPublic.length);
console.log(`${COLORS.cyan}Privados:${COLORS.reset}`, commandsPrivate.length);

const instance = axios.create({
  baseURL: "https://discord.com/api/v10",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

(async () => {
  try {
    console.log(`\n${COLORS.yellow}Conectando a Discord...${COLORS.reset}`);

    if (isGlobalDeploy) {
      console.log(`${COLORS.cyan}MODO GLOBAL${COLORS.reset}`);

      if (commandsPublic.length) {
        console.log(
          `📤 Subiendo ${commandsPublic.length} comandos públicos...`,
        );

        try {
          const response = await instance.put(
            `/applications/${BOT_ID}/commands`,
            commandsPublic,
          );
          console.log(`${COLORS.green}✅ OK públicos${COLORS.reset}`);
        } catch (error: any) {
          if (error.response?.status === 429) {
            const retryAfter = error.response?.data?.retry_after || 60;
            console.error(`${COLORS.red}❌ RATE LIMITED${COLORS.reset}`);
            console.error(
              `   Espera ${Math.ceil(retryAfter)} segundos e intenta de nuevo`,
            );
            throw error;
          }
          throw error;
        }
      }

      if (GUILD_ID && commandsPrivate.length) {
        console.log(
          `📤 Subiendo ${commandsPrivate.length} comandos privados...`,
        );

        try {
          await instance.put(
            `/applications/${BOT_ID}/guilds/${GUILD_ID}/commands`,
            commandsPrivate,
          );
          console.log(`${COLORS.green}✅ OK privados${COLORS.reset}`);
        } catch (error: any) {
          if (error.response?.status === 429) {
            const retryAfter = error.response?.data?.retry_after || 60;
            console.error(`${COLORS.red}❌ RATE LIMITED${COLORS.reset}`);
            console.error(
              `   Espera ${Math.ceil(retryAfter)} segundos e intenta de nuevo`,
            );
            throw error;
          }
          throw error;
        }
      }
    } else {
      if (!GUILD_ID) throw new Error("Falta GUILD_ID en .env");

      const all = [...commandsPublic, ...commandsPrivate];
      console.log(`📤 Subiendo ${all.length} comandos al servidor...`);

      try {
        const response = await instance.put(
          `/applications/${BOT_ID}/guilds/${GUILD_ID}/commands`,
          all,
        );
        console.log(`${COLORS.green}✅ OK guild${COLORS.reset}`);
      } catch (error: any) {
        if (error.response?.status === 429) {
          const retryAfter = error.response?.data?.retry_after || 60;
          console.error(`${COLORS.red}❌ RATE LIMITED${COLORS.reset}`);
          console.error(
            `   Espera ${Math.ceil(retryAfter)} segundos e intenta de nuevo`,
          );
          throw error;
        }
        throw error;
      }
    }

    console.log(
      `\n${COLORS.green}✨ DEPLOY COMPLETADO EXITOSAMENTE${COLORS.reset}`,
    );
    process.exit(0);
  } catch (err: any) {
    console.error(`\n${COLORS.red}❌ ERROR:${COLORS.reset}`);
    console.error("Status:", err.response?.status);
    console.error("Mensaje:", err.response?.data?.message || err.message);
    process.exit(1);
  }
})();
