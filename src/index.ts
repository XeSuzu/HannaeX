import {
  Client,
  Collection,
  GatewayIntentBits,
  Options,
  Partials,
} from "discord.js";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { HoshikoLogger, LogLevel, PerformanceMonitor } from "./Security";
import { connectWithRetry } from "./Services/mongo";
import { loadAntiCrash } from "./Utils/antiCrash";
import { startCronJobs } from "./scripts/cronJobs"; // ← MOVIDO AQUÍ

const nodeEnv = process.env.NODE_ENV || "development";
const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
dotenv.config({ path: envPath, override: true });
console.log(`.env.${nodeEnv} loaded from: ${envPath}`);

import { PrefixCommand, SlashCommand } from "./Interfaces/Command";

loadAntiCrash();

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req: Request, res: Response) => {
  res.send("Hoshiko Bot is running perfectly");
});

app.get("/healthz", (req: Request, res: Response) => {
  res.send("ok");
});

/**
 * HoshikoClient - Extended Discord client with custom collections and configuration
 */
export class HoshikoClient extends Client<true> {
  /** Collection of prefix-based commands */
  public commands = new Collection<string, PrefixCommand>();

  /** Collection of slash commands */
  public slashCommands = new Collection<string, SlashCommand>();

  /** Cooldown tracking per command per user */
  public cooldowns = new Collection<string, Collection<string, number>>();

  /** Bot configuration from environment variables */
  public config = {
    token: process.env.TOKEN || "",
    BotId: process.env.BOT_ID || "",
    prefix: process.env.PREFIX || "!",
    guildIds: process.env.GUILD_ID
      ? process.env.GUILD_ID.split(",").map((id) => id.trim())
      : [],
  };
}

const BOT_ID = process.env.BOT_ID || "";

const client = new HoshikoClient({
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    PresenceManager: 1000,
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
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

/**
 * Loads all handler files from the Handlers directory.
 * Each handler is responsible for registering specific functionality (commands, events).
 */
const loadHandlers = () => {
  const handlersDir = path.join(__dirname, "Handlers");
  if (!fs.existsSync(handlersDir)) return;

  const handlerFiles = fs
    .readdirSync(handlersDir)
    .filter(
      (file) =>
        (file.endsWith(".js") || file.endsWith(".ts")) &&
        !file.endsWith(".map.js") &&
        !file.endsWith(".d.ts"),
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
        message: `Error loading handler ${file}`,
        metadata: error,
      });
    }
  });
};

(async () => {
  try {
    if (!client.config.token) {
      throw new Error("TOKEN not found in .env file");
    }

    const stats = PerformanceMonitor.getSystemStats();
    HoshikoLogger.log({
      level: LogLevel.INFO,
      context: "System/Performance",
      message: `Hoshiko starting on ${stats.platform}. RAM usage: ${stats.ramUsage}`,
    });

    await connectWithRetry();

    loadHandlers();

    app.listen(PORT, () => {
      HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "System/Web",
        message: `Health server active on port ${PORT}`,
      });
    });

    await client.login(client.config.token);
    startCronJobs(client);
  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    HoshikoLogger.log({
      level: LogLevel.FATAL,
      context: "System/Startup",
      message: "Critical error during startup",
      metadata: err,
    });
    process.exit(1);
  }
})();

async function shutdown(signal: string) {
  HoshikoLogger.log({
    level: LogLevel.WARN,
    context: "System/Shutdown",
    message: `Signal ${signal} received. Shutting down Hoshiko safely...`,
  });

  try {
    client.destroy();
    HoshikoLogger.log({
      level: LogLevel.INFO,
      context: "System",
      message: "Discord client destroyed.",
    });
  } catch (e) {
    console.error("Error during shutdown:", e);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default client;
