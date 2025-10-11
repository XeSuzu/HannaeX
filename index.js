require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require('fs');
const path = require('path');

// Configuración del cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Inicialización de colecciones para comandos
client.commands = new Collection();
client.slashCommands = new Collection();

// Creación del objeto de configuración completo
client.config = {
  token: process.env.TOKEN,
  BotId: process.env.BOT_ID,
  prefix: process.env.PREFIX,
  // Esta es la línea crucial que ahora está en su sitio correcto
  guildIds: process.env.GUILD_ID.split(',').map(id => id.trim()),
};

// Cargar Handlers de forma modular
// (Tu commandHandler, eventHandler y databaseHandler se cargarán aquí)
const handlersDir = path.join(__dirname, "Handlers");
fs.readdirSync(handlersDir).forEach(file => {
    require(path.join(handlersDir, file))(client);
});

// Iniciar sesión del bot
client.login(process.env.TOKEN);