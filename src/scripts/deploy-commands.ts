import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// ======================
// VALIDACIÓN DE ENTORNO
// ======================
const { TOKEN, BOT_ID } = process.env;

if (!TOKEN || !BOT_ID) {
    console.error("❌ Faltan variables de entorno esenciales (TOKEN, BOT_ID).");
    process.exit(1);
}

// ======================
// CARGA DE COMANDOS
// ======================
interface CommandFile {
    data: SlashCommandBuilder | any;
    execute: Function;
}

const commands: object[] = [];
const slashPath = path.join(__dirname, '../Commands/SlashCmds');

try {
    const slashFolders = fs.readdirSync(slashPath);
    for (const folder of slashFolders) {
        const folderPath = path.join(slashPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        // Aceptar .ts y .js para despliegue según entorno
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const commandModule = require(filePath);
                const command: CommandFile = commandModule.default || commandModule;
                
                if (command.data && command.execute) {
                    if (Array.isArray(command.data)) {
                        command.data.forEach((cmdData: any) => commands.push(cmdData.toJSON()));
                    } else {
                        commands.push(command.data.toJSON());
                    }
                }
            } catch (error: any) {
                console.error(`   ❌ Error cargando ${file}:`, error.message || error);
            }
        }
    }
} catch (error: any) {
    console.error(`❌ Error al leer la carpeta de comandos:`, error.message);
    process.exit(1);
}

if (commands.length === 0) {
    console.warn("⚠️ No se encontraron comandos para desplegar.");
    process.exit(0);
}

// ======================
// DEPLOY + LIMPIEZA GLOBAL
// ======================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log("\n🧹 Obteniendo comandos globales existentes para limpiar...");
        const existingCommands = await rest.get(Routes.applicationCommands(BOT_ID)) as any[];

        for (const cmd of existingCommands) {
            await rest.delete(Routes.applicationCommand(BOT_ID, cmd.id));
            console.log(`✅ Eliminado comando antiguo: ${cmd.name}`);
        }

        console.log(`\n🚀 Desplegando ${commands.length} comandos nuevos globalmente...`);
        const data = await rest.put(
            Routes.applicationCommands(BOT_ID),
            { body: commands }
        ) as any[];

        console.log(`\n✅ ${data.length} comandos desplegados globalmente con éxito.`);
        console.log("\n═══════════════════════════════════════");
        console.log("✨ ¡Despliegue completo y limpio!");
        console.log("═══════════════════════════════════════\n");

    } catch (error: any) {
        console.error("\n❌ Error en el despliegue global:", error.message);
        process.exit(1);
    }
})();
