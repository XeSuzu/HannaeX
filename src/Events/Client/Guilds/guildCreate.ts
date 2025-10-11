import { REST, Routes, Guild, Events } from "discord.js";
import path from 'path';
import fs from 'fs';
// ✅ CORRECCIÓN 1: La ruta ahora tiene tres niveles (../../../)
import { HoshikoClient } from '../../../index'; 

export = {
    name: Events.GuildCreate,

    async execute(guild: Guild, client: HoshikoClient) {
        console.log(`🌸 Bot unido al servidor: ${guild.name} (${guild.id})`);

        const slashPath = path.join(__dirname, "../../../Commands/SlashCmds"); // Ajustamos la ruta también aquí
        if (!fs.existsSync(slashPath)) {
            return console.warn("⚠️ No existe la carpeta de comandos SlashCmds");
        }

        const slashCommandsArray: object[] = [];
        const slashFolders = fs.readdirSync(slashPath);

        for (const folder of slashFolders) {
            const folderPath = path.join(slashPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".ts"));
            
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(folderPath, file));
                    if (command.data) {
                        if (Array.isArray(command.data)) {
                            // ✅ CORRECCIÓN 2: Añadimos el tipo 'any' a cmdData
                            command.data.forEach((cmdData: any) => slashCommandsArray.push(cmdData.toJSON()));
                        } else {
                            slashCommandsArray.push(command.data.toJSON());
                        }
                    }
                } catch (err: any) {
                    console.error(`❌ Error cargando el comando ${file}:`, err.message);
                }
            }
        }

        const rest = new REST({ version: "10" }).setToken(client.config.token!);

        try {
            await rest.put(
                Routes.applicationGuildCommands(client.config.BotId!, guild.id), 
                { body: slashCommandsArray }
            );
            console.log(`✅ ${slashCommandsArray.length} comandos registrados correctamente en ${guild.name}`);
        } catch (err: any) {
            console.error(`❌ Error registrando comandos en ${guild.name}:`, err.message);
        }
    },
};