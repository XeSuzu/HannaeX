import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
// ✨ Importamos PerformanceMonitor desde el puente de Security
import { HoshikoLogger, LogLevel, PerformanceMonitor } from './Security'; 

// --- Configuración de Express (Health Check) ---
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req: Request, res: Response) => {
  res.send('Hoshiko Bot está funcionando perfectamente 🌸');
});

app.get('/healthz', (req: Request, res: Response) => {
  res.send('ok');
});

app.listen(PORT, () => {
  HoshikoLogger.log({
    level: LogLevel.INFO,
    context: 'System/Web',
    message: `Servidor de salud activo en puerto ${PORT}`
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
    cooldowns: Map<string, number>;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
    ],
}) as HoshikoClient;

client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Map();

client.config = {
    token: process.env.TOKEN || '',
    BotId: process.env.BOT_ID || '',
    prefix: process.env.PREFIX || '',
    guildIds: process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(id => id.trim()) : [],
};

// --- Carga de Handlers ---
const handlersDir = path.join(__dirname, 'Handlers');

if (fs.existsSync(handlersDir)) {
    const handlerFiles = fs.readdirSync(handlersDir)
      .filter(file => file.endsWith('.js') && !file.endsWith('.map.js'));

    handlerFiles.forEach(file => {
        try {
            const handlerModule = require(path.join(handlersDir, file));
            const handler = handlerModule.default || handlerModule;
            
            if (typeof handler === 'function') {
                handler(client);
            }
        } catch (error) {
            HoshikoLogger.log({
                level: LogLevel.ERROR,
                context: 'System/Handlers',
                message: `Error cargando handler ${file}`,
                metadata: error
            });
        }
    });
}

// --- Eventos del Sistema (READY CON MONITOR DE RENDIMIENTO) ---
client.once('ready', () => {
    // 📊 Obtenemos las estadísticas de salud del sistema
    const stats = PerformanceMonitor.getSystemStats();

    // ✨ Log de éxito que ahora incluye RAM y Uptime
    HoshikoLogger.log({
        level: LogLevel.SUCCESS,
        context: 'System/Ready',
        message: `✨ ${client.user?.tag} en línea. Vigilando ${client.guilds.cache.size} servidores. [RAM: ${stats.ramUsage} | CPU: ${stats.cpuLoad}]`
    });
});

// Captura de errores no manejados
process.on('unhandledRejection', (error) => {
    HoshikoLogger.log({
        level: LogLevel.FATAL,
        context: 'System/Fatal',
        message: 'Promesa rechazada no manejada detectada',
        metadata: error
    });
});

// --- Arranque Principal ---
(async () => {
  try {
    const initDatabase = require('./Handlers/databaseHandler').default || require('./Handlers/databaseHandler');
    
    if (!client.config.token) {
        throw new Error('No se encontró el TOKEN en el archivo .env');
    }

    await initDatabase();
    await client.login(client.config.token);
    
  } catch (err) {
    HoshikoLogger.log({
        level: LogLevel.FATAL,
        context: 'System/Startup',
        message: 'Error crítico durante el inicio',
        metadata: err
    });
    process.exit(1);
  }
})();

// --- Apagado Seguro ---
async function shutdown(signal: string) {
  HoshikoLogger.log({
    level: LogLevel.WARN,
    context: 'System/Shutdown',
    message: `Recibida señal ${signal}. Cerrando servicios...`
  });
  
  const { disconnect } = require('./Services/mongo');
  try { await disconnect(); } catch (e) {}
  try { client.destroy(); } catch (e) {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default client;