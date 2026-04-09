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
      console.log(`✓ ${data.name}`);
    } catch (err) {
      console.error('❌ Error cargando comando:', err.message);
    }
  }
}

console.log('Cargando comandos...\n');
loadCommands(distPath);

console.log(`\n✅ Cargados: ${commands.length} comandos\n`);

const rest = new REST({ version: '10', timeout: 120000 }).setToken(TOKEN);

(async () => {
  try {
    // Probar con los primeros 3 comandos
    const testBatch = commands.slice(0, 3);
    
    console.log(`🚀 Test 1: Enviando batch de ${testBatch.length} comandos...`);
    let start = Date.now();
    let response = await rest.put(Routes.applicationCommands(BOT_ID), { body: testBatch });
    console.log(`✅ Éxito en ${Date.now() - start}ms: ${response.length} comandos\n`);
    
    // Ahora todos
    console.log(`🚀 Test 2: Enviando batch de ${commands.length} comandos...`);
    start = Date.now();
    response = await rest.put(Routes.applicationCommands(BOT_ID), { body: commands });
    console.log(`✅ Éxito en ${Date.now() - start}ms: ${response.length} comandos\n`);
    
    console.log('✨ DEPLOY FUNCIONANDO CORRECTAMENTE');
    
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Request path:', error.requestPath);
    
    if (error.rawError?.data) {
      console.error('\nDatos de Discord:');
      console.error(JSON.stringify(error.rawError.data, null, 2));
    }
  }
})();
