// Usamos 'import' para los módulos, la sintaxis moderna de TS.
import 'dotenv/config'; // Este paquete carga las variables de .env automáticamente.
import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando Hoshiko Bot...');

// ✨ ¡La Magia de TypeScript empieza aquí!
// 1. Definimos una "interfaz" para nuestro cliente. Es como un carnet de identidad
// que le dice a TypeScript qué propiedades personalizadas tiene nuestro bot.
export interface HoshikoClient extends Client {
    commands: Collection<string, any>;
    slashCommands: Collection<string, any>;
    config: {
        token?: string;
        BotId?: string;
        prefix?: string;
        guildIds: string[]; // Le decimos que guildIds es un array de strings
    };
}

// 2. Creamos el cliente y le aplicamos nuestra interfaz personalizada.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
    ],
}) as HoshikoClient; // 'as HoshikoClient' es como ponerle la etiqueta con su nombre.

console.log('✅ Cliente de Discord creado');

// 3. Inicializamos las propiedades que definimos en la interfaz.
client.commands = new Collection();
client.slashCommands = new Collection();
client.config = {
    token: process.env.TOKEN,
    BotId: process.env.BOT_ID,
    prefix: process.env.PREFIX,
    // Hacemos el código más seguro: si GUILD_ID no existe, usa una lista vacía para evitar que el bot crashee.
    guildIds: process.env.GUILD_ID ? process.env.GUILD_ID.split(',').map(id => id.trim()) : [],
};

console.log('✅ Configuración cargada');
console.log(`   Prefix: ${client.config.prefix}`);
console.log(`   Guild IDs: ${client.config.guildIds.length > 0 ? client.config.guildIds.join(', ') : 'Ninguno'}`);

// ⚠️ VALIDACIÓN CRÍTICA: Verificar que el token existe
if (!client.config.token) {
    console.error('❌ ERROR CRÍTICO: No se encontró TOKEN en el archivo .env');
    console.error('   Por favor, asegúrate de tener TOKEN=tu_token en tu archivo .env');
    process.exit(1);
}

// 4. Cargamos los Handlers (la lógica se mantiene, pero ahora es más segura).
console.log('📂 Cargando handlers...');
const handlersDir = path.join(__dirname, "Handlers");

try {
    const handlerFiles = fs.readdirSync(handlersDir);
    console.log(`   Encontrados ${handlerFiles.length} handlers: ${handlerFiles.join(', ')}`);
    
    handlerFiles.forEach(file => {
        try {
            console.log(`   Cargando handler: ${file}`);
            const handlerModule = require(path.join(handlersDir, file));
            
            // ✅ CORRECCIÓN: TypeScript con export default pone la función en .default
            const handler = handlerModule.default || handlerModule;
            
            if (handler && typeof handler === 'function') {
                handler(client);
                console.log(`   ✅ Handler ${file} cargado`);
            } else {
                console.warn(`   ⚠️ Handler ${file} no es una función válida`);
                console.warn(`   Tipo recibido:`, typeof handler);
            }
        } catch (error) {
            console.error(`   ❌ Error cargando handler ${file}:`, error);
        }
    });
} catch (error) {
    console.error('❌ Error leyendo el directorio de handlers:', error);
    process.exit(1);
}

// 5. Evento READY - CRÍTICO para saber que el bot se conectó
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

// 6. Manejo de errores globales
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

// 7. Iniciamos sesión en Discord.
console.log('🔐 Intentando iniciar sesión en Discord...');
client.login(client.config.token)
    .then(() => {
        console.log('✅ Login exitoso, esperando evento ready...');
    })
    .catch((error) => {
        console.error('❌ ERROR AL INICIAR SESIÓN:');
        console.error('   Detalles:', error);
        console.error('');
        console.error('   Posibles causas:');
        console.error('   1. Token inválido o expirado');
        console.error('   2. No tienes conexión a internet');
        console.error('   3. Discord está caído');
        console.error('');
        console.error('   Verifica tu TOKEN en el archivo .env');
        process.exit(1);
    });

// 8. Exportamos el cliente para usarlo en otros archivos si es necesario
export default client;