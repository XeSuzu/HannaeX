const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const slashPath = path.join(__dirname, 'Commands/SlashCmds');

const slashFolders = fs.readdirSync(slashPath);

for (const folder of slashFolders) {
  const folderPath = path.join(slashPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      if (Array.isArray(command.data)) {
        command.data.forEach(cmdData => commands.push(cmdData.toJSON()));
      } else {
        commands.push(command.data.toJSON());
      }
    } else {
      console.log(`[WARNING] El comando en ${filePath} le falta la propiedad "data" o "execute".`);
    }
  }
}

// ======================
//    CONFIGURACIÓN DE AUTORIZACIÓN
// ======================
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// ======================
//    DESPLEGAR COMANDOS
// ======================
(async () => {
  try {
    console.log(`🚀 Iniciando el refresco de ${commands.length} comandos de barra (/).`);

    // ======================================
    //   OPCIÓN 1: Desplegar en un solo servidor (RÁPIDO)
    // ======================================
    // Esto es ideal para desarrollo. Los comandos se actualizan casi instantáneamente.
    // Necesitas el ID de un servidor en tu .env.
    // const data = await rest.put(
    //   Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    //   { body: commands },
    // );
    // console.log(`✅ Se recargaron ${data.length} comandos en el servidor de desarrollo.`);

    // ======================================
    //   OPCIÓN 2: Desplegar globalmente (LENTO)
    // ======================================
    // Usa esto solo cuando tus comandos estén listos para producción.
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`✅ Se recargaron ${data.length} comandos globalmente.`);

  } catch (error) {
    console.error(error);
  }
})();