// index.ts
import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { Player } from 'discord-player';
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';

// Express 
const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Bot is running');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Cargar extractores
(async () => {
    await import('@discord-player/extractor');
})();

console.log('🚀 Iniciando Hoshiko Bot...');

export interface HoshikoClient extends Client {
    commands: Collection<string, any>;
    slashCommands: Collection<string, any>;
    config: {
        token?: string;
        BotId?: string;
        prefix?: string;
        guildIds: string[]; 
    };
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
    ],
}) as HoshikoClient;

console.log('✅ Cliente de Discord creado');

client.commands = new Collection();
client.slashCommands = new Collection();
client.config = {
    token: process.env.TOKEN || '',
    BotId: process.env.BOT_ID || '',
    prefix: process.env.PREFIX || '',
    guildIds: process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(id => id.trim()) : [],
};

console.log('✅ Configuración cargada');
console.log(`   Prefix: ${client.config.prefix}`);
console.log(`   Guild IDs: ${client.config.guildIds.length > 0 ? client.config.guildIds.join(', ') : 'Ninguno'}`);

// ---- INICIALIZAR DISCORD-PLAYER ----
const player = new Player(client);

console.log('✅ Discord-Player inicializado');

if (!client.config.token) {
    console.error('❌ ERROR CRÍTICO: No se encontró TOKEN en el archivo .env');
    process.exit(1);
}

console.log('📂 Cargando handlers...');
const handlersDir = path.join(__dirname, "Handlers");

try {
    const handlerFiles = fs.readdirSync(handlersDir);
    console.log(`   Encontrados ${handlerFiles.length} handlers: ${handlerFiles.join(', ')}`);
    
    handlerFiles.forEach(file => {
        try {
            console.log(`   Cargando handler: ${file}`);
            const handlerModule = require(path.join(handlersDir, file));
            const handler = handlerModule.default || handlerModule;
            
            if (handler && typeof handler === 'function') {
                handler(client);
                console.log(`   ✅ Handler ${file} cargado`);
            } else {
                console.warn(`   ⚠️ Handler ${file} no es una función válida`);
            }
        } catch (error) {
            console.error(`   ❌ Error cargando handler ${file}:`, error);
        }
    });
} catch (error) {
    console.error('❌ Error leyendo el directorio de handlers:', error);
    process.exit(1);
}

client.once('ready', () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✨ ${client.user?.tag} está en línea!`);
    console.log(`🆔 ID: ${client.user?.id}`);
    console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios: ${client.users.cache.size}`);
    console.log('═══════════════════════════════════════');
    console.log('');
});

client.on('error', (error) => {
    console.error('❌ Error del cliente de Discord:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Promesa rechazada no manejada:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1);
});

console.log('🔐 Intentando iniciar sesión en Discord...');
client.login(client.config.token)
    .then(() => {
        console.log('✅ Login exitoso, esperando evento ready...');
    })
    .catch((error) => {
        console.error('❌ ERROR AL INICIAR SESIÓN:');
        console.error('   Detalles:', error);
        console.error('   Posibles causas:');
        console.error('   1. Token inválido o expirado');
        console.error('   2. No tienes conexión a internet');
        console.error('   3. Discord está caído');
        console.error('   Verifica tu TOKEN en el archivo .env');
        process.exit(1);
    });

export default client;