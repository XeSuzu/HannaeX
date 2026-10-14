const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.BOT_ID || process.env.CLIENT_ID; // Probamos ambos nombres

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ ERROR: No encuentro el TOKEN o BOT_ID en el archivo .env");
    process.exit(1);
}

const commands = [];
// Ruta a los comandos compilados
const commandsPath = path.join(__dirname, 'dist', 'Commands', 'SlashCmds');

console.log("🚑 --- INICIANDO PROTOCOLO DE EMERGENCIA ---");
console.log(`📂 Buscando en: ${commandsPath}`);

function readCommands(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            readCommands(filePath); // Recursividad
        } else if (file.endsWith('.js')) {
            try {
                // Borramos caché para asegurar frescura
                delete require.cache[require.resolve(filePath)];
                const commandModule = require(filePath);
                const command = commandModule.default || commandModule;

                if (command && command.data) {
                    // Convertir a JSON
                    const cmdJson = command.data.toJSON ? command.data.toJSON() : command.data;
                    commands.push(cmdJson);
                    console.log(`   ✅ Encontrado: /${cmdJson.name}`);
                }
            } catch (err) {
                console.error(`   ⚠️ Error en ${file}: ${err.message}`);
            }
        }
    }
}

// 1. Leer comandos
if (fs.existsSync(commandsPath)) {
    readCommands(commandsPath);
} else {
    console.error("❌ LA CARPETA 'dist' NO EXISTE o la ruta está mal.");
    console.error("   Ejecuta 'npm run build' primero.");
    process.exit(1);
}

if (commands.length === 0) {
    console.error("❌ No encontré ningún comando. ¿Seguro que compilaste?");
    process.exit(1);
}

console.log(`\n📦 Total preparado para subir: ${commands.length} comandos.`);

// 2. Subir a Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('📡 Contactando a Discord para restaurar la insignia...');

        // FORZAR GLOBAL (Esto hace que vuelva la insignia)
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('🎉 ¡ÉXITO! Comandos subidos correctamente.');
        console.log('⏳ La insignia volverá en unos minutos (puede tardar hasta 1 hora en caché global).');
        console.log('👉 Reinicia Discord (Ctrl + R) para probar.');

    } catch (error) {
        console.error('💥 Error Fatal:', error);
    }
})();