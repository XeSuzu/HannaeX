const fs = require('fs');
const path = require('path');

const distPath = '/home/hannae/Downloads/Hoshiko/HannaeX/dist/Commands/SlashCmds';

let totalBytes = 0;
let largeCommands = [];

function checkAllCommands(dir, prefix = '') {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkAllCommands(fullPath, prefix + file.name + '/');
      continue;
    }
    
    if (!file.name.endsWith('.js')) continue;
    
    try {
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      const cmd = mod.default || mod;
      
      if (!cmd?.data) {
        console.log('❌ SIN DATA:', prefix + file.name);
        continue;
      }
      
      let data = cmd.data;
      if (typeof data.toJSON === 'function') {
        data = data.toJSON();
      }
      
      const json = JSON.stringify(data);
      const bytes = json.length;
      totalBytes += bytes;
      
      console.log(`✅ ${prefix}${file.name}: ${bytes} bytes`);
      
      if (bytes > 3000) {
        largeCommands.push({ name: prefix + file.name, bytes });
      }
      
      if (bytes > 4000) {
        console.log(`   ⚠️  ALERTA: Supera límite Discord (4000 bytes)`);
      }
    } catch (err) {
      console.log('💥 ERROR:', prefix + file.name, err.message.substring(0, 100));
    }
  }
}

console.log('Inspeccionando todos los comandos...\n');
checkAllCommands(distPath);

console.log(`\n📊 RESUMEN:`);
console.log(`Total: ${totalBytes} bytes`);
console.log(`Promedio: ${Math.round(totalBytes / 39)} bytes`);

if (largeCommands.length > 0) {
  console.log(`\n⚠️  COMANDOS GRANDES (>3000 bytes):`);
  largeCommands.forEach(cmd => {
    console.log(`  - ${cmd.name}: ${cmd.bytes} bytes`);
  });
}
