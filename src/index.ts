import "dotenv/config";
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
// 👇 Importamos la conexión robusta
import { connectWithRetry } from "./Services/mongo";

// 1. ACTIVAR MODO INMORTAL
loadAntiCrash();

// --- Configuración de Express (Health Check) ---
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req: Request, res: Response) => {
  res.send("Hoshiko Bot está funcionando perfectamente 🌸");
});

app.get("/healthz", (req: Request, res: Response) => {
  res.send("ok");
});

app.listen(PORT, () => {
  HoshikoLogger.log({
    level: LogLevel.INFO,
    context: "System/Web",
    message: `Servidor de salud activo en puerto ${PORT}`,
  });
});

// --- Interfaz del Cliente ---
export interface HoshikoClient extends Client<true> {
  commands: Collection<string, any>;
  slashCommands: Collection<string, any>;
  config: {
    token?: string;
    BotId?: string;
    prefix?: string;
    guildIds: string[];
  };
  cooldowns: Collection<string, Collection<string, number>>;
}

// 2. CLIENTE CON GESTIÓN DE RAM (Optimización)
const client = new Client({
  // 👇 Mantenemos la optimización de RAM
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    PresenceManager: 0,
    UserManager: {
      maxSize: 1000,
      keepOverLimit: (user) => user.id === client.user?.id,
    },
    GuildMemberManager: {
      maxSize: 1000,
      keepOverLimit: (member) => member.id === client.user?.id,
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
}) as HoshikoClient;

// 🧠 Inicializamos las colecciones
client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection(); //

client.config = {
  token: process.env.TOKEN || "",
  BotId: process.env.BOT_ID || "",
  prefix: process.env.PREFIX || "!",
  guildIds: process.env.GUILD_ID
    ? process.env.GUILD_ID.split(",").map((id) => id.trim())
    : [],
};

// --- Carga de Handlers ---
const handlersDir = path.join(__dirname, "Handlers");

if (fs.existsSync(handlersDir)) {
  const handlerFiles = fs
    .readdirSync(handlersDir)
    .filter(
      (file) =>
        (file.endsWith(".js") || file.endsWith(".ts")) &&
        !file.endsWith(".map.js"),
    );

  handlerFiles.forEach((file) => {
    // Evitamos cargar handlers de base de datos viejos
    if (file.includes("database") || file.includes("mongo")) return;

    try {
      const handlerPath = path.join(handlersDir, file);
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
}

// --- Arranque Principal ---
(async () => {
  try {
    if (!client.config.token) {
      throw new Error("No se encontró el TOKEN en el archivo .env");
    }

    // 3. CONEXIÓN A MONGODB
    await connectWithRetry();

    // 4. Iniciar sesión
    // NOTA: No llamamos a statusRotator aquí porque tu ready.ts ya lo hace.
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

// --- Apagado Seguro ---
async function shutdown(signal: string) {
  HoshikoLogger.log({
    level: LogLevel.WARN,
    context: "System/Shutdown",
    message: `Señal ${signal} recibida. Apagando...`,
  });

  try {
    client.destroy();
  } catch (e) {}
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default client;
