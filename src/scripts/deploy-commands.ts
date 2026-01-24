import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { TOKEN, BOT_ID, GUILD_ID } = process.env; // GUILD_ID = Tu servidor privado (Casa)
const isGlobalDeploy = process.argv.includes('--global');

if (!TOKEN || !BOT_ID) {
    console.error("❌ Faltan variables de entorno (TOKEN, BOT_ID).");
    process.exit(1);
}

// Listas separadas
const commandsPublic: any[] = [];
const commandsPrivate: any[] = []; // Solo para categoría 'Owner'

/**
 * IMPORTANTE: Buscamos en 'dist' porque es el código compilado JS.
 */
const slashPath = path.resolve(process.cwd(), 'dist/Commands/SlashCmds');

function getCommandsRecursively(dir: string) {
    if (!fs.existsSync(dir)) {
        console.warn(`   ⚠️ La carpeta no existe: ${dir}`);
        return;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
            getCommandsRecursively(fullPath);
        } 
        else if (item.isFile() && item.name.endsWith('.js') && !item.name.endsWith('.d.ts')) {
            try {
                // Limpiar caché
                delete require.cache[require.resolve(fullPath)];
                const commandModule = require(fullPath);
                
                // Manejar export default o module.exports
                const command = commandModule.default || commandModule;

                if (!command || !command.data) continue;

                const commandJSON = (typeof command.data.toJSON === 'function') 
                    ? command.data.toJSON() 
                    : command.data;

                if (commandJSON && commandJSON.name) {
                    // 🔍 FILTRO DE CATEGORÍA
                    // Si la carpeta se llama 'Owner' o la categoría es 'Owner', es PRIVADO.
                    // Nota: Verificamos el nombre del directorio padre para saber si está en la carpeta Owner
                    const parentDir = path.basename(dir);
                    
                    if (command.category === 'Owner' || parentDir === 'Owner') {
                        commandsPrivate.push(commandJSON);
                        console.log(`   🔒 [Privado] /${commandJSON.name}`);
                    } else {
                        commandsPublic.push(commandJSON);
                        console.log(`   wd [Público] /${commandJSON.name}`);
                    }
                }
            } catch (error: any) {
                console.error(`   ❌ Error cargando ${item.name}:`, error.message);
            }
        }
    }
}

console.log("🌸 --- Hoshiko Command Deployer --- 🌸");
console.log(`📂 Buscando archivos compilados en: ${slashPath}`);

getCommandsRecursively(slashPath);

if (commandsPublic.length === 0 && commandsPrivate.length === 0) {
    console.warn("⚠️ No se encontraron comandos.");
    console.warn("   Asegúrate de haber ejecutado 'npm run build' antes.");
    process.exit(0);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        // 1. PUBLICAR COMANDOS PRIVADOS (Solo en tu Casa)
        if (GUILD_ID && commandsPrivate.length > 0) {
            console.log(`\n🔒 Desplegando ${commandsPrivate.length} comandos PRIVADOS en tu servidor (${GUILD_ID})...`);
            await rest.put(
                Routes.applicationGuildCommands(BOT_ID, GUILD_ID),
                { body: commandsPrivate }
            );
            console.log(`✅ Comandos privados asegurados.`);
        } else if (commandsPrivate.length > 0) {
            console.warn("\n⚠️ Tienes comandos privados pero no configuraste GUILD_ID en el .env.");
        }

        // 2. PUBLICAR COMANDOS PÚBLICOS
        if (isGlobalDeploy) {
            console.log(`\n🚀 Desplegando ${commandsPublic.length} comandos PÚBLICOS de forma GLOBAL...`);
            // Nota: Esto puede tardar hasta 1 hora en actualizarse en todos los servers
            await rest.put(
                Routes.applicationCommands(BOT_ID),
                { body: commandsPublic }
            );
            console.log(`✅ ¡Éxito! Comandos globales sincronizados.`);

        } else {
            // Modo Desarrollo: Pone los públicos también como comandos de guild
            const GUILD_IDS = process.env.GUILD_IDS?.split(',') || [];
            if (GUILD_IDS.length === 0 || !GUILD_IDS[0]) {
                console.error("❌ Error: No hay GUILD_IDS en el .env para despliegue de desarrollo.");
                process.exit(1);
            }

            console.log(`\n🔧 Desplegando públicos en servidores de desarrollo: [${GUILD_IDS.length} servidores]`);

            for (const guildId of GUILD_IDS) {
                const cleanId = guildId.trim();
                if (!cleanId) continue;
                
                // Si este servidor es "Tu Casa" (GUILD_ID), hay que tener cuidado de no borrar los privados.
                // En Discord, 'applicationGuildCommands' SOBREESCRIBE todo lo que hay en ese guild.
                // Por tanto, si es tu casa, le enviamos (Públicos + Privados).
                // Si es otro server, solo Públicos.
                
                let payload = commandsPublic;
                if (cleanId === GUILD_ID) {
                    console.log(`   🏠 Detectado servidor casa (${cleanId}): Fusionando listas...`);
                    payload = [...commandsPublic, ...commandsPrivate];
                }

                await rest.put(
                    Routes.applicationGuildCommands(BOT_ID, cleanId),
                    { body: payload }
                );
                console.log(`   ✅ Sincronizado: ${cleanId}`);
            }
        }

        console.log("\n✨ ¡Hoshiko ha actualizado todo con éxito! Nyaa~ 🐾\n");
    } catch (error: any) {
        console.error("\n❌ Error durante el despliegue:");
        console.error(error);
    }
})();