const axios = require('axios');
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
    } catch (err) {}
  }
}

loadCommands(distPath);

console.log(`Cargados ${commands.length} comandos\n`);

// Usar axios con timeout corto para ver si el problema es time out
const instance = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    'Authorization': `Bot ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000  // 60 segundos
});

(async () => {
  try {
    console.log('📤 Enviando 3 primeros comandos con axios...');
    
    const batch = commands.slice(0, 3);
    const start = Date.now();
    
    const response = await instance.put(
      `/applications/${BOT_ID}/commands`,
      batch
    );
    
    console.log(`✅ Éxito en ${Date.now() - start}ms`);
    console.log(`Status: ${response.status}`);
    console.log(`Comandos: ${response.data.length}`);
    
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Message:', error.message);
    if (error.response?.data) {
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('Code:', error.code);
    }
  }
})();
