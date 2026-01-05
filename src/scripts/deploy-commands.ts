import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { TOKEN, BOT_ID } = process.env;
const isGlobalDeploy = process.argv.includes('--global');

if (!TOKEN || !BOT_ID) {
    console.error("❌ Faltan variables de entorno (TOKEN, BOT_ID).");
    process.exit(1);
}

const commands: object[] = [];
const slashPath = path.join(__dirname, '../Commands/SlashCmds');

// --- FUNCIÓN RECURSIVA MÁGICA ✨ (Mejorada) ---
function getCommandsRecursively(dir: string) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            getCommandsRecursively(fullPath);
        } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.js')) && !item.name.endsWith('.d.ts') && !item.name.endsWith('.js.map')) {
            try {
                // Limpiar caché de require para asegurar carga fresca
                delete require.cache[require.resolve(fullPath)];
                const commandModule = require(fullPath);
                const command = commandModule.default || commandModule;

                if (!command.data) {
                    console.warn(`   ⚠️ Omitido ${item.name}: no tiene propiedad 'data'.`);
                    continue;
                }

                const commandDataItems = Array.isArray(command.data) ? command.data : [command.data];

                for (const data of commandDataItems) {
                    // Acepta builders (.toJSON) y objetos JSON ya serializados.
                    const commandJSON = (typeof data.toJSON === 'function') ? data.toJSON() : data;

                    if (commandJSON && commandJSON.name) {
                        commands.push(commandJSON);
                        console.log(`   🔎 Encontrado: /${commandJSON.name}`);
                    } else {
                        console.warn(`   ⚠️ Omitido ${item.name}: la 'data' no es válida o no tiene 'name'.`);
                    }
                }
            } catch (error: any) {
                console.error(`   ❌ Error cargando ${item.name}:`, error.message);
            }
        }
    }
}

console.log("🌸 Iniciando búsqueda de comandos para despliegue...");
getCommandsRecursively(slashPath);

if (commands.length === 0) {
    console.warn("⚠️ No se encontraron comandos válidos para desplegar.");
    process.exit(0);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        if (isGlobalDeploy) {
            // --- DESPLIEGUE GLOBAL (PRODUCCIÓN) ---
            console.log(`\n🚀 Desplegando ${commands.length} comandos de forma GLOBAL.`);
            console.warn("   ⚠️ Los comandos globales pueden tardar hasta una hora en propagarse por todos los servidores.");

            await rest.put(
                Routes.applicationCommands(BOT_ID),
                { body: commands }
            );

            console.log(`✅ ¡Éxito! Comandos globales sincronizados.`);

        } else {
            // --- DESPLIEGUE POR SERVIDOR (DESARROLLO) ---
            const GUILD_IDS = process.env.GUILD_IDS?.split(',') || [];
            if (GUILD_IDS.length === 0 || GUILD_IDS.every(id => !id.trim())) {
                console.error("❌ Para despliegue por servidor, la variable GUILD_IDS debe contener IDs válidos en tu .env");
                console.error("   Para un despliegue global, ejecuta el script con el flag --global");
                process.exit(1);
            }

            console.log(`\n🚀 Desplegando ${commands.length} comandos en ${GUILD_IDS.length} servidor(es) de desarrollo: [${GUILD_IDS.join(', ')}]`);

            for (const guildId of GUILD_IDS) {
                if (!guildId.trim()) continue;
                console.log(`   - Sincronizando para el servidor: ${guildId.trim()}`);
                await rest.put(
                    Routes.applicationGuildCommands(BOT_ID, guildId.trim()),
                    { body: commands }
                );
            }
            console.log(`✅ ¡Éxito! Comandos de desarrollo sincronizados.`);
        }

        console.log("\n✨ ¡Hoshiko ha actualizado sus comandos en Discord! Nyaa~ 🐾\n");
    } catch (error: any) {
        console.error("\n❌ Error catastrófico durante el despliegue:");
        console.error(error);
    }
})();