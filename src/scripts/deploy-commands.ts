import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

console.log(`${COLORS.cyan}--- DEPLOYER PRO MAX ---${COLORS.reset}\n`);

const { TOKEN, BOT_ID, GUILD_ID, GUILD_IDS } = process.env;
const isGlobalDeploy = process.argv.includes("--global");

if (!TOKEN || !BOT_ID) {
  console.error(`${COLORS.red}Falta TOKEN o BOT_ID en .env${COLORS.reset}`);
  process.exit(1);
}

const token: string = TOKEN;
const botId: string = BOT_ID;
const guildIdRaw: string | undefined = GUILD_ID;
// Support multiple guilds via GUILD_IDS env var (comma separated or JSON array)
let guildIds: string[] = [];
if (GUILD_IDS) {
  try {
    const trimmed = GUILD_IDS.trim();
    if (trimmed.startsWith("[")) {
      guildIds = JSON.parse(trimmed);
    } else {
      guildIds = trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch (e) {
    // fallback to comma split
    guildIds = (GUILD_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
} else if (guildIdRaw) {
  guildIds = [guildIdRaw];
}

/* ================= CARGA Y VALIDACIÓN ================= */

const distPath = path.resolve(process.cwd(), "dist/Commands/SlashCmds");

const commandsPublic: any[] = [];
const commandsPrivate: any[] = [];

function validateCommand(cmd: any, file: string) {
  if (!cmd.name || !cmd.description) {
    console.log(
      `${COLORS.red}❌ ${file} → name o description faltante${COLORS.reset}`,
    );
    return false;
  }

  if (cmd.name.length > 32) {
    console.log(
      `${COLORS.red}❌ ${cmd.name} → name muy largo (max 32)${COLORS.reset}`,
    );
    return false;
  }

  if (cmd.description.length > 100) {
    console.log(
      `${COLORS.red}❌ ${cmd.name} → description muy larga (max 100)${COLORS.reset}`,
    );
    return false;
  }

  if (cmd.options?.length > 25) {
    console.log(
      `${COLORS.red}❌ ${cmd.name} → demasiadas opciones (max 25)${COLORS.reset}`,
    );
    return false;
  }

  // Validar tamaño JSON (Discord: max 4000 bytes)
  try {
    const jsonSize = JSON.stringify(cmd).length;
    if (jsonSize > 4000) {
      console.log(
        `${COLORS.red}❌ ${cmd.name} → JSON muy grande (${jsonSize}/4000 bytes)${COLORS.reset}`,
      );
      return false;
    }
  } catch (e) {
    console.log(
      `${COLORS.red}❌ ${cmd.name} → no es JSON válido${COLORS.reset}`,
    );
    return false;
  }

  return true;
}

function loadCommands(dir: string) {
  if (!fs.existsSync(dir)) {
    console.warn(
      `${COLORS.yellow}⚠️  Ruta no encontrada: ${dir}${COLORS.reset}`,
    );
    return;
  }

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

      if (!cmd?.data) {
        console.log(
          `${COLORS.red}❌ ${file.name}: sin propiedad 'data'${COLORS.reset}`,
        );
        continue;
      }

      // Permitir data.toJSON() O data directamente
      let data = cmd.data;
      if (typeof data.toJSON === "function") {
        data = data.toJSON();
      }

      // Validación
      if (!data?.name) {
        console.log(
          `${COLORS.red}❌ ${file.name}: data.name faltante${COLORS.reset}`,
        );
        continue;
      }

      if (!validateCommand(data, file.name)) continue;

      // Separar por privacidad
      const isPrivate = cmd.devOnly === true || cmd.category === "Owner";
      isPrivate ? commandsPrivate.push(data) : commandsPublic.push(data);

      console.log(`${COLORS.green}✔ ${data.name}${COLORS.reset}`);
    } catch (err: any) {
      console.error(
        `${COLORS.red}💥 Error cargando ${file.name}:${COLORS.reset}`,
        err.message || err,
      );
    }
  }
}

console.log(`${COLORS.yellow}Leyendo comandos...${COLORS.reset}`);
loadCommands(distPath);

console.log(`\n${COLORS.cyan}Públicos:${COLORS.reset}`, commandsPublic.length);
console.log(`${COLORS.cyan}Privados:${COLORS.reset}`, commandsPrivate.length);

if (!commandsPublic.length && !commandsPrivate.length) {
  console.error(
    `${COLORS.red}No hay comandos válidos para subir${COLORS.reset}`,
  );
  process.exit(1);
}

/* ================= DEPLOY CON AXIOS ================= */

const instance = axios.create({
  baseURL: "https://discord.com/api/v10",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

async function deploy() {
  try {
    console.log(`${COLORS.yellow}Conectando a Discord...${COLORS.reset}`);

    if (isGlobalDeploy) {
      console.log(
        `\n${COLORS.blue}⚡ MODO GLOBAL${COLORS.reset} (disponible en todos los servidores)`,
      );

      if (commandsPublic.length) {
        console.log(
          `\n📤 Subiendo ${commandsPublic.length} comandos públicos...`,
        );
        try {
          const response = await instance.put(
            `/applications/${botId}/commands`,
            commandsPublic,
          );
          console.log(
            `${COLORS.green}✅ Comandos públicos sincronizados globalmente${COLORS.reset}`,
          );
        } catch (error: any) {
          if (error.response?.status === 429) {
            const retryAfter = error.response?.data?.retry_after || 60;

            console.error(
              `\n${COLORS.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
            );
            console.error(
              `${COLORS.red}❌ RATE LIMITED - Límite diario excedido${COLORS.reset}`,
            );
            console.error(
              `${COLORS.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
            );
            console.error(
              `\n📊 ${COLORS.cyan}Información del Rate Limit:${COLORS.reset}`,
            );
            console.error(`   • Límite global: 200 cambios/día`);
            console.error(`   • Ya usados: 200`);
            console.error(`   • Disponibles hoy: 0`);
            console.error(
              `   • ⏱️  Próximo reset: ${Math.ceil(retryAfter)} segundos (~${Math.ceil(retryAfter / 60)} minutos)`,
            );

            console.error(`\n💡 ${COLORS.yellow}Soluciones:${COLORS.reset}`);
            console.error(
              `   1️⃣  Espera ${Math.ceil(retryAfter)} segundos y reintenta`,
            );
            console.error(
              `   2️⃣  Usa 'npm run deploy' (modo servidor sin límite)`,
            );
            console.error(`   3️⃣  Intenta mañana después de las 24 horas`);
            console.error();

            process.exit(1);
          }
          throw error;
        }
      }

      if (guildIds.length && commandsPrivate.length) {
        console.log(
          `\n📤 Subiendo ${commandsPrivate.length} comandos privados a ${guildIds.length} servidor(es)...`,
        );
        for (const gid of guildIds) {
          try {
            await instance.put(
              `/applications/${botId}/guilds/${gid}/commands`,
              commandsPrivate,
            );
            console.log(
              `${COLORS.green}✅ Comandos privados sincronizados en ${gid}${COLORS.reset}`,
            );
          } catch (error: any) {
            if (error.response?.status === 429) {
              const retryAfter = error.response?.data?.retry_after || 60;
              console.error(
                `${COLORS.red}❌ RATE LIMITED en ${gid}${COLORS.reset}`,
              );
              console.error(
                `   Espera ${Math.ceil(retryAfter)} segundos e intenta de nuevo`,
              );
              process.exit(1);
            }
            throw error;
          }
        }
      }
    } else {
      if (!guildIds.length)
        throw new Error("Falta GUILD_ID o GUILD_IDS en .env para deploy local");

      console.log(
        `\n${COLORS.blue}🏠 MODO SERVIDOR${COLORS.reset} (deploy a ${guildIds.length} servidor(es))`,
      );

      const all = [...commandsPublic, ...commandsPrivate];
      for (const gid of guildIds) {
        console.log(
          `\n📤 Subiendo ${all.length} comandos al servidor ${gid}...`,
        );
        try {
          await instance.put(
            `/applications/${botId}/guilds/${gid}/commands`,
            all,
          );
          console.log(
            `${COLORS.green}✅ Comandos sincronizados en ${gid}${COLORS.reset}`,
          );
        } catch (error: any) {
          if (error.response?.status === 429) {
            const retryAfter = error.response?.data?.retry_after || 60;
            console.error(
              `${COLORS.red}❌ RATE LIMITED en ${gid}${COLORS.reset}`,
            );
            console.error(
              `   Espera ${Math.ceil(retryAfter)} segundos e intenta de nuevo`,
            );
            process.exit(1);
          }
          throw error;
        }
      }
    }

    console.log(
      `\n${COLORS.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
    );
    console.log(
      `${COLORS.green}✨ DEPLOY COMPLETADO EXITOSAMENTE${COLORS.reset}`,
    );
    console.log(
      `${COLORS.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`,
    );

    process.exit(0);
  } catch (err: any) {
    console.error(
      `\n${COLORS.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
    );
    console.error(`${COLORS.red}❌ ERROR EN DEPLOY${COLORS.reset}`);
    console.error(
      `${COLORS.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
    );
    console.error(`\nStatus: ${err.response?.status || err.status}`);
    console.error(`Mensaje: ${err.response?.data?.message || err.message}`);
    console.error();
    process.exit(1);
  }
}

deploy();
