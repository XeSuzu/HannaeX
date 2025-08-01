const path = require('path');
const fs = require('fs');
const { REST, Routes } = require('discord.js');

module.exports = (client) => {
    const config = client.config;
    // Prefix Command Handler
    const prefixPath = path.join(__dirname, '../Commands/PrefixCmds');
    const prefixFolders = fs.readdirSync(prefixPath);
    for (const folder of prefixFolders) {
        const folderPath = path.join(prefixPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if (command && command.name) {
                client.commands.set(command.name, command);
                console.log(`[INFO] Loaded prefix command: ${command.name}`);
            } else {
                console.warn(`[ERR] Skipping invalid prefix command: ${file}`);
            }
        }
    }

    // Slash Command Handler
    const slashPath = path.join(__dirname, '../Commands/SlashCmds');
    const slashFolders = fs.readdirSync(slashPath);
    const slashCommandsArray = [];
    for (const folder of slashFolders) {
        const folderPath = path.join(slashPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(folderPath, file));
            if (command && command.data && command.data.name) {
                client.slashCommands.set(command.data.name, command);
                slashCommandsArray.push(command.data.toJSON());
                console.log(`[INFO] Loaded slash command: ${command.data.name}`);
            } else {
                console.warn(`[ERR] Skipping invalid slash command: ${file}`);
            }
        }
    }

    // Registro solo en servidor especifico
    client.once('ready', async () => {
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        try {
            // Limpieza de comandos globales
            console.log('🧹 [LIMPIEZA] Eliminando comandos globales innecesarios...');
            await rest.put(Routes.applicationCommands(config.BotId), { body: [] });
            console.log('✅ [LIMPIEZA] Comandos globales eliminados');
            
            // Espera para que Discord procese
            console.log('⏰ Esperando 3 segundos...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 📝 REGISTRA solo en tu servidor (instantáneo)
            if (Array.isArray(config.GuildId)) {
                for (const guildId of config.GuildId) {
                    console.log(`📝 [REGISTRO] Registrando comandos en servidor: ${guildId}`);
                    await rest.put(
                        Routes.applicationGuildCommands(config.BotId, guildId),
                        { body: slashCommandsArray }
                    );
                    console.log(`✅ [ÉXITO] ${slashCommandsArray.length} comandos registrados correctamente`);
                }
            }
            
        } catch (err) {
            console.error('❌ [ERROR] Falló el registro:', err);
        }
    });
};