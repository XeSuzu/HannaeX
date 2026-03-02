import dotenv from "dotenv";

import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Options,
} from "discord.js";
import fs from "fs";
import path from "path";
import express, { Request, Response } from "express";
import { HoshikoLogger, LogLevel, PerformanceMonitor } from "./Security";
import { loadAntiCrash } from "./Utils/antiCrash";

// Carga el archivo .env correspondiente al entorno actual.
// Si NODE_ENV no está definido (ej: al correr `npm run dev`), usa 'development' por defecto.
// Carga el archivo .env correspondiente al entorno actual.
const nodeEnv = process.env.NODE_ENV || "development";
const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
dotenv.config({ path: envPath, override: true });
console.log(`✅ .env.${nodeEnv} cargado desde: ${envPath}`); // Debug para PM2

import { SlashCommand, PrefixCommand } from "./Interfaces/Command";

loadAntiCrash();

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req: Request, res: Response) => {
  res.send("Hoshiko Bot está funcionando perfectamente 🌸");
});

app.get("/healthz", (req: Request, res: Response) => {
  res.send("ok");
});

export class HoshikoClient extends Client<true> {
  public commands = new Collection<string, PrefixCommand>();
  public slashCommands = new Collection<string, SlashCommand>();
  public cooldowns = new Collection<string, Collection<string, number>>();

  public config = {
    token: process.env.TOKEN || "",
    BotId: process.env.BOT_ID || "",
    prefix: process.env.PREFIX || "!",
    guildIds: process.env.GUILD_ID
      ? process.env.GUILD_ID.split(",").map(id => id.trim())
      : [],
  };
}

// Se extrae el BOT_ID para evitar una referencia circular en la inicialización del cliente.
const BOT_ID = process.env.BOT_ID || "";

// 2. CLIENTE CON GESTIÓN DE RAM OPTIMIZADA
const client = new HoshikoClient({
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    PresenceManager: 0,
    UserManager: {
      maxSize: 1000,
      keepOverLimit: (user) => user.id === BOT_ID,
    },
    GuildMemberManager: {
      maxSize: 1000,
      keepOverLimit: (member) => member.id === BOT_ID,
    },
  }),
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- Carga de Handlers (Refactorizada para evitar duplicados) ---
const loadHandlers = () => {
  const handlersDir = path.join(__dirname, "Handlers");
  if (!fs.existsSync(handlersDir)) return;

  const handlerFiles = fs
    .readdirSync(handlersDir)
    .filter((file) => 
      (file.endsWith(".js") || file.endsWith(".ts")) && 
      !file.endsWith(".map.js") && 
      !file.endsWith(".d.ts")
    );

  handlerFiles.forEach((file) => {
    if (file.includes("database") || file.includes("mongo")) return;

    try {
      const handlerPath = path.join(handlersDir, file);
      delete require.cache[require.resolve(handlerPath)];
      
      const handlerModule = require(handlerPath);
      const handler = handlerModule.default || handlerModule;

      if (typeof handler === "function") {
        handler(client);
      }
    } catch (error) {
      HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "System/Handlers",
        message: `Error cargando handler ${file}`,
        metadata: error,
      });
    }
  });
};

// --- Arranque Principal ---
(async () => {
  try {
    if (!client.config.token) {
      throw new Error("No se encontró el TOKEN en el archivo .env");
    }

    // 1. Monitor de Rendimiento
    const stats = PerformanceMonitor.getSystemStats();
    HoshikoLogger.log({
         level: LogLevel.INFO,
         context: "System/Performance",
         message: `Hoshiko iniciando en ${stats.platform}. RAM en uso: ${stats.ramUsage}`,
   });

    // 2. Conectar a MongoDB
    await connectWithRetry();

    // 3. Cargar Eventos y Comandos
    loadHandlers();

    // 4. Iniciar Servidor Web
    app.listen(PORT, () => {
      HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "System/Web",
        message: `Servidor de salud activo en puerto ${PORT}`,
      });
    });

    // 5. Login
    await client.login(client.config.token);

  } catch (err) {
    HoshikoLogger.log({
      level: LogLevel.FATAL,
      context: "System/Startup",
      message: "Error crítico durante el inicio",
      metadata: err,
    });
    process.exit(1);
  }
})();

// --- Apagado Seguro (Graceful Shutdown) ---
async function shutdown(signal: string) {
  HoshikoLogger.log({
    level: LogLevel.WARN,
    context: "System/Shutdown",
    message: `Señal ${signal} recibida. Apagando Hoshiko de forma segura...`,
  });

  try {
    // Aquí puedes cerrar conexiones de base de datos si fuera necesario
    client.destroy();
    HoshikoLogger.log({ level: LogLevel.INFO, context: "System", message: "Cliente de Discord destruido." });
  } catch (e) {
    console.error("Error durante el cierre:", e);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

import { connectWithRetry } from "./Services/mongo";
export default client;