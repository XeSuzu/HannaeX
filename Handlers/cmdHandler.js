const path = require('path');
const fs = require('fs');
const { REST, Routes } = require('discord.js');

module.exports = (client) => {
    const config = client.config;

    // ========================
    //  CARGA DE COMANDOS DE PREFIJO
    // ========================
    const loadPrefixCommands = () => {
        const prefixPath = path.join(__dirname, '../Commands/PrefixCmds');
        const prefixFolders = fs.readdirSync(prefixPath);
        let count = 0;

        for (const folder of prefixFolders) {
            const folderPath = path.join(prefixPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const command = require(path.join(folderPath, file));
                    if (command && command.name) {
                        client.commands.set(command.name, command);
                        count++;
                    }
                } catch (err) {
                    console.error(`❌ Falló al cargar prefijo ${file}: ${err.message}`);
                }
            }
        }
        console.log(`📜 ${count} comandos de prefijo cargados`);
    };
    loadPrefixCommands();

    // ========================
    //  CARGA DE SLASH COMMANDS
    // ========================
    const loadSlashCommands = () => {
        const slashPath = path.join(__dirname, '../Commands/SlashCmds');
        const slashFolders = fs.readdirSync(slashPath);
        const slashCommandsArray = [];
        for (const folder of slashFolders) {
            const folderPath = path.join(slashPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const command = require(path.join(folderPath, file));
                    if (command && command.data && command.execute) {
                        if (Array.isArray(command.data)) {
                            for (const cmdData of command.data) {
                                if (cmdData?.name) {
                                    client.slashCommands.set(cmdData.name, command);
                                    slashCommandsArray.push(cmdData.toJSON());
                                }
                            }
                        } else if (command.data.name) {
                            client.slashCommands.set(command.data.name, command);
                            slashCommandsArray.push(command.data.toJSON());
                        }
                    }
                } catch (err) {
                    console.error(`❌ Falló al cargar slash ${file}: ${err.message}`);
                }
            }
        }
        return slashCommandsArray;
    };
    const slashCommandsArray = loadSlashCommands();

    // ========================
    //  REGISTRO DE SLASH COMMANDS EN DISCORD 🌸
    // ========================
    client.once('ready', async () => {
        const rest = new REST({ version: '10' }).setToken(config.token);

        const resumen = { registered: {}, failed: [] };

        if (!Array.isArray(config.guildIds) || config.guildIds.length === 0) {
            console.warn('⚠️ Nyaa~ No hay GuildId configurado. Registro omitido!');
            return;
        }

        for (const guildId of config.guildIds) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(config.BotId, guildId),
                    { body: slashCommandsArray }
                );
                resumen.registered[guildId] = slashCommandsArray.map(cmd => cmd.name);
            } catch (err) {
                resumen.failed.push({ guildId, error: err.message });
            }
        }

        // ========================
        //  MENSAJE RESUMIDO KAWAII
        // ========================
        let output = `🌸✨ Nyaa~ ¡Registro de comandos completado! 💖\n`;

        for (const guildId in resumen.registered) {
            const guildName = client.guilds.cache.get(guildId)?.name || 'Servidor desconocido';
            output += `\n💮 Comandos listos en ${guildName} (${guildId}):\n`;
            resumen.registered[guildId].forEach(name => output += `   - /${name}\n`);
        }

        if (resumen.failed.length > 0) {
            output += `\n⚠️ Ups~ Algunos comandos fallaron:\n`;
            resumen.failed.forEach(f => output += `   - Servidor ${f.guildId}: ${f.error}\n`);
        }

        output += `\n🌟 ¡Todo listo para ronronear con tus comandos! >w<`;
        console.log(output);
    });
};
