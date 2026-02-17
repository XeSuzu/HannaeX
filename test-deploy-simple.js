const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const TOKEN = process.env.TOKEN;
const BOT_ID = process.env.BOT_ID;

const distPath = '/home/hannae/Downloads/Hoshiko/HannaeX/dist/Commands/SlashCmds';

let commands = [];

function loadCommands(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }
    
    if (!file.name.endsWith('.js')) continue;
    
    try {
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      const cmd = mod.default || mod;
      
      if (!cmd?.data) continue;
      
      let data = cmd.data;
      if (typeof data.toJSON === 'function') {
        data = data.toJSON();
      }
      
      commands.push(data);
    } catch (err) {
      console.error('Error cargando comando:', err.message);
    }
  }
}

console.log('Cargando comandos...');
loadCommands(distPath);

console.log(`Cargados: ${commands.length} comandos\n`);

// Hacer PUT lentamente, probando de a 5 comandos
const rest = new REST({ version: '10', timeout: 120000 }).setToken(TOKEN);

(async () => {
  try {
    console.log('⏳ Obteniendo comandos actuales...');
    const current = await rest.get(Routes.applicationCommands(BOT_ID));
    console.log(`✅ ${current.length} comandos actualmente\n`);
    
    console.log(`🚀 Enviando batch de ${commands.length} comandos...`);
    
    const startTime = Date.now();
    const response = await rest.put(Routes.applicationCommands(BOT_ID), { 
      body: commands 
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`\n✅ ÉXITO en ${elapsed}ms`);
    console.log(`Sincronizados: ${response.length} comandos`);
    
  } catch (error) {
    console.error('\n❌ ERROR AL SINCRONIZAR:');
    console.error('Status:', error.status);
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    if (error.rawError) {
      console.error('RawError:', JSON.stringify(error.rawError, null, 2).substring(0, 500));
    }
  }
})();
