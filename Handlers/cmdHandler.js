const path = require('path');
const fs = require('fs');
const { REST, Routes, Collection } = require('discord.js');

/**
 * Lee recursivamente los archivos de comando de un directorio y los carga.
 * @param {string} directoryPath La ruta al directorio que contiene las carpetas de comandos.
 * @returns {Array<object>} Un array con todos los comandos cargados.
 */
function loadCommands(directoryPath) {
    const commands = [];
    if (!fs.existsSync(directoryPath)) {
        console.warn(`⚠️ El directorio de comandos no existe: ${directoryPath}`);
        return commands;
    }

    const commandFolders = fs.readdirSync(directoryPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(directoryPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                if (command) {
                    commands.push(command);
                }
            } catch (error) {
                console.error(`❌ Error al cargar el comando en ${filePath}:`, error);
            }
        }
    }
    return commands;
}

/**
 * Registra los slash commands en los servidores (guilds) especificados en la configuración.
 * @param {Client} client El cliente de Discord.js.
 * @param {Array<object>} slashCommandsData Los datos de los slash commands listos para ser registrados.
 */
async function registerSlashCommands(client, slashCommandsData) {
    const { config } = client;
    if (!Array.isArray(config.guildIds) || config.guildIds.length === 0) {
        console.warn('⚠️ Nyaa~ No hay IDs de servidor (guildIds) en la configuración. Se omite el registro de slash commands.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(config.token);
    const summary = { registered: {}, failed: [] };

    for (const guildId of config.guildIds) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(config.BotId, guildId), 
                { body: slashCommandsData }
            );
            summary.registered[guildId] = slashCommandsData.map(cmd => cmd.name);
        } catch (error) {
            summary.failed.push({ guildId, error: error.message });
            console.error(`❌ Falló el registro de comandos en el servidor ${guildId}:`, error);
        }
    }

    logRegistrationSummary(client, summary, slashCommandsData.length);
}

/**
 * Muestra en consola un resumen del resultado del registro de comandos.
 * @param {Client} client El cliente de Discord.js.
 * @param {object} summary El objeto con los resultados del registro.
 * @param {number} totalCommands El número total de comandos que se intentaron registrar.
 */
function logRegistrationSummary(client, summary, totalCommands) {
    const outputLines = ['🌸✨ ¡Registro de comandos completado! 💖'];

    for (const guildId in summary.registered) {
        const guild = client.guilds.cache.get(guildId);
        outputLines.push(`\n💮 Comandos listos en "${guild?.name || 'Servidor desconocido'}" (${guildId}):`);
        summary.registered[guildId].forEach(name => outputLines.push(`   - /${name}`));
    }

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
 * Carga todos los comandos de prefijo y slash, y configura el registro de estos últimos.
 * @param {Client} client El cliente de Discord.js. Debe tener una propiedad 'config'.
 */
module.exports = (client) => {
    // Inicializar colecciones si no existen
    client.commands = new Collection();
    client.slashCommands = new Collection();
    
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
    const slashCommandsToRegister = [];
    for (const command of slashCommands) {
        if (command.data && command.execute) {
            client.slashCommands.set(command.data.name, command);
            slashCommandsToRegister.push(command.data.toJSON());
        }
    }
    console.log(`✨ ${client.slashCommands.size} slash commands cargados.`);

    // --- Registro de Slash Commands cuando el bot esté listo ---
    client.once('ready', () => {
        if (slashCommandsToRegister.length > 0) {
            registerSlashCommands(client, slashCommandsToRegister);
        }
    });
};