import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"; // 👈 Agregado Partials
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
// ✨ Importamos PerformanceMonitor y Logger
import { HoshikoLogger, LogLevel, PerformanceMonitor } from './Security'; 
// 📚 Importamos el Schema de roles activos para el limpiador
import ActiveRole from './Database/Schemas/ActiveRole'; 

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
    // 🚑 PARTIALS: Vital para que detecte reacciones en mensajes viejos
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.Reaction
    ]
}) as HoshikoClient;

// 🧠 Inicializamos las colecciones
client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Map();

client.config = {
    token: process.env.TOKEN || '',
    BotId: process.env.BOT_ID || '',
    prefix: process.env.PREFIX || '!', // Prefijo por defecto
    guildIds: process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(id => id.trim()) : [],
};

// --- Carga de Handlers ---
const handlersDir = path.join(__dirname, 'Handlers');

if (fs.existsSync(handlersDir)) {
    // Buscamos archivos .js o .ts (según tu entorno)
    const handlerFiles = fs.readdirSync(handlersDir)
      .filter(file => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.map.js'));

    handlerFiles.forEach(file => {
        try {
            const handlerPath = path.join(handlersDir, file);
            const handlerModule = require(handlerPath);
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

// --- Eventos del Sistema ---
client.once('ready', () => {
    const stats = PerformanceMonitor.getSystemStats();

    // 🔍 DEBUG: Verificamos la carga de comandos en consola
    console.log('-------------------------------------------');
    console.log(`🌸 Comandos cargados (Normal): ${client.commands.size}`);
    console.log(`🌸 Comandos cargados (Slash): ${client.slashCommands.size}`);
    console.log('-------------------------------------------');

    HoshikoLogger.log({
        level: LogLevel.SUCCESS,
        context: 'System/Ready',
        message: `✨ ${client.user?.tag} en línea. Vigilando ${client.guilds.cache.size} servidores. [RAM: ${stats.ramUsage}]`
    });

    // ⏰ SISTEMA DE LIMPIEZA DE ROLES TEMPORALES
    // Revisa cada 60 segundos si hay roles que deben ser retirados
    setInterval(async () => {
        try {
            const now = new Date();
            // Buscamos en la DB roles cuya fecha de expiración sea menor o igual a ahora
            const expiredRoles = await ActiveRole.find({ expiresAt: { $lte: now } });

            for (const doc of expiredRoles) {
                // Obtenemos el servidor
                const guild = client.guilds.cache.get(doc.guildId);
                if (!guild) {
                    // Si el bot ya no está en ese server, solo borramos el registro
                    await ActiveRole.deleteOne({ _id: doc._id });
                    continue;
                }

                // Obtenemos al usuario
                const member = await guild.members.fetch(doc.userId).catch(() => null);
                
                if (member) {
                    // Quitamos el rol
                    await member.roles.remove(doc.roleId).catch(err => 
                        console.error(`⚠️ No pude quitar el rol a ${doc.userId}: ${err.message}`)
                    );
                    
                    HoshikoLogger.log({
                        level: LogLevel.INFO,
                        context: 'RoleSystem',
                        message: `⏳ Rol temporal retirado a ${member.user.tag}`
                    });
                }

                // Borramos de la DB para no procesarlo de nuevo
                await ActiveRole.deleteOne({ _id: doc._id });
            }
        } catch (error) {
            console.error('❌ Error en el limpiador de roles:', error);
        }
    }, 60 * 1000); // 60 segundos
});

// Captura de errores no manejados para que el bot no muera
process.on('unhandledRejection', (error) => {
    HoshikoLogger.log({
        level: LogLevel.FATAL,
        context: 'System/Fatal',
        message: 'Promesa rechazada no manejada',
        metadata: error
    });
});

// --- Arranque Principal ---
(async () => {
  try {
    const databaseHandlerPath = path.join(__dirname, 'Handlers', 'databaseHandler');
    const initDatabase = require(databaseHandlerPath).default || require(databaseHandlerPath);
    
    if (!client.config.token) {
        throw new Error('No se encontró el TOKEN en el archivo .env');
    }

    // 1. Conectamos a la base de datos
    await initDatabase();
    
    // 2. Iniciamos sesión en Discord
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
    message: `Señal ${signal} recibida. Apagando...`
  });
  
  try { client.destroy(); } catch (e) {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default client;