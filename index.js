const { Client, Collection, GatewayIntentBits } = require("discord.js");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Validación de variables
['TOKEN','BOT_ID','GUILD_ID','PREFIX','GEMINI_API_KEY','MONGO_URI'].forEach(key => {
  if (!process.env[key]) {
    console.error(`[ERROR] Falta la variable de entorno: ${key}`);
    process.exit(1);
  }
});

// Configuración del cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.config = {
  token: process.env.TOKEN,
  BotId: process.env.BOT_ID,
  guildIds: process.env.GUILD_ID.split(",").map(id => id.trim()),
  prefix: process.env.PREFIX,
};

// Handlers
const handlersDir = path.join(__dirname, "Handlers");
fs.readdirSync(handlersDir)
  .filter(file => file.endsWith(".js"))
  .forEach(file => require(path.join(handlersDir, file))(client));

// Eventos
const eventsDir = path.join(__dirname, "Events");
fs.readdirSync(eventsDir)
  .filter(file => file.endsWith(".js"))
  .forEach(file => {
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  });

// Login
client.login(client.config.token);
