const fs = require('fs');
const path = require('path');

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
      console.error('Error:', err.message);
    }
  }
}

loadCommands(distPath);

console.log('Primeros 3 comandos para enviar:\n');

const batch = commands.slice(0, 3);

batch.forEach((cmd, i) => {
  console.log(`\n[${i + 1}] ${cmd.name}`);
  console.log(JSON.stringify(cmd, null, 2));
});

console.log('\n\n=== PAYLOAD COMPLETO ===\n');
const fullPayload = JSON.stringify(batch);
console.log(fullPayload.substring(0, 2000));
console.log(`\n... (total: ${fullPayload.length} bytes)`);
