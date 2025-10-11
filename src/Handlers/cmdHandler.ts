import path from 'path';
import fs from 'fs';
import { REST, Routes, Collection, Client } from 'discord.js';
import { HoshikoClient } from '../index'; // Importamos nuestra interfaz de cliente personalizada

// ==========================================================
//  Definimos las "Interfaces" o moldes para nuestros objetos
// ==========================================================
interface CommandFile {
    name?: string; // Para comandos de prefijo
    data?: any;    // Para slash commands
    execute: (...args: any[]) => void;
}

interface RegistrationSummary {
    registered: { [key: string]: string[] };
    failed: { guildId: string; error: string }[];
}


// ==========================================================
//  Migramos las funciones con sus nuevos tipos
// ==========================================================

/**
 * Lee y carga los archivos de comando de un directorio.
 * @param directoryPath La ruta al directorio de comandos.
 * @returns Un array con todos los comandos cargados.
 */
function loadCommands(directoryPath: string): CommandFile[] {
    const commands: CommandFile[] = [];
    if (!fs.existsSync(directoryPath)) {
        console.warn(`⚠️ El directorio de comandos no existe: ${directoryPath}`);
        return commands;
    }

    const commandFolders = fs.readdirSync(directoryPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(directoryPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                if (command) {
                    commands.push(command);
                }
            } catch (error: any) {
                console.error(`❌ Error al cargar el comando en ${filePath}:`, error.message);
            }
        }
    }
    return commands;
}

/**
 * Registra los slash commands en los servidores especificados.
 * @param client El cliente de Discord.js.
 * @param slashCommandsData Los datos de los slash commands a registrar.
 */
async function registerSlashCommands(client: HoshikoClient, slashCommandsData: any[]) {
    const { config } = client;
    if (!Array.isArray(config.guildIds) || config.guildIds.length === 0) {
        console.warn('⚠️ Nyaa~ No hay IDs de servidor (guildIds) en la configuración. Se omite el registro de slash commands.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(config.token!);
    const summary: RegistrationSummary = { registered: {}, failed: [] };

    for (const guildId of config.guildIds) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(config.BotId!, guildId),
                { body: slashCommandsData }
            );
            summary.registered[guildId] = slashCommandsData.map(cmd => cmd.name);
        } catch (error: any) {
            summary.failed.push({ guildId, error: error.message });
            console.error(`❌ Falló el registro de comandos en el servidor ${guildId}:`, error.message);
        }
    }

    logRegistrationSummary(client, summary, slashCommandsData.length);
}

/**
 * Muestra un resumen del registro de comandos.
 * @param client El cliente de Discord.js.
 * @param summary El objeto con los resultados.
 * @param totalCommands El número total de comandos.
 */
function logRegistrationSummary(client: Client, summary: RegistrationSummary, totalCommands: number) {
    const outputLines = ['🌸✨ ¡Registro de comandos completado! 💖'];

    for (const guildId in summary.registered) {
        const guild = client.guilds.cache.get(guildId);
        outputLines.push(`\n💮 Comandos listos en "${guild?.name || 'Servidor desconocido'}" (${guildId}):`);
        summary.registered[guildId].forEach(name => outputLines.push(`   - /${name}`));
    }
    
    // ... (El resto de la lógica de log se mantiene igual)
    if (summary.failed.length > 0) {
        outputLines.push('\n⚠️ Ups~ Algunos registros de servidor fallaron:');
        summary.failed.forEach(f => outputLines.push(`   - Servidor ${f.guildId}: ${f.error}`));
    }

    const successfulGuilds = Object.keys(summary.registered).length;
    const failedGuilds = summary.failed.length;
    outputLines.push(`\nTotal de comandos para registrar: ${totalCommands}`);
    outputLines.push(`Servidores exitosos: ${successfulGuilds} | Servidores fallidos: ${failedGuilds}`);
    
    console.log(outputLines.join('\n'));
}

/**
 * Inicializador principal del manejador de comandos.
 */
export default (client: HoshikoClient) => {
    // --- Carga de Comandos de Prefijo ---
    const prefixCommandsPath = path.join(__dirname, '../Commands/PrefixCmds');
    const prefixCommands = loadCommands(prefixCommandsPath);
    for (const command of prefixCommands) {
        if (command.name) {
            client.commands.set(command.name, command);
        }
    }
    console.log(`📜 ${client.commands.size} comandos de prefijo cargados.`);

    // --- Carga de Slash Commands ---
    const slashCommandsPath = path.join(__dirname, '../Commands/SlashCmds');
    const slashCommands = loadCommands(slashCommandsPath);
    const slashCommandsToRegister: any[] = [];
    for (const command of slashCommands) {
        // ✅ AQUÍ ESTÁ LA CORRECCIÓN
        // Confiamos en la interfaz y solo verificamos la existencia de 'data'
        if (command.data) {
            client.slashCommands.set(command.data.name, command);
            slashCommandsToRegister.push(command.data.toJSON());
        }
    }
    console.log(`✨ ${client.slashCommands.size} slash commands cargados.`);

    // --- Registro de Slash Commands cuando el bot esté listo ---
    client.once('ready', () => {
        console.log('[COMMAND HANDLER] El evento "ready" se ha disparado. Registrando comandos...');
        if (slashCommandsToRegister.length > 0) {
            registerSlashCommands(client, slashCommandsToRegister);
        }
    });
};