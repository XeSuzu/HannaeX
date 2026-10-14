const fs = require('fs');
const path = require('path');

const distPath = path.resolve(process.cwd(), 'dist/Commands/SlashCmds');

const commands = [];

function loadCommands(dir, depth = 0) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      loadCommands(fullPath, depth + 1);
      continue;
    }

    if (!file.name.endsWith('.js')) continue;

    try {
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      const cmd = mod.default || mod;

      if (!cmd?.data) {
        console.log(`❌ ${file.name}: sin data`);
        continue;
      }

      let data = cmd.data;
      if (typeof data.toJSON === 'function') {
        data = data.toJSON();
      }

      commands.push({ name: data.name, file: file.name, data });
    } catch (err) {
      console.error(`💥 Error en ${file.name}:`, err.message);
    }
  }
}

console.log('Cargando comandos...');
loadCommands(distPath);

console.log(`\n✅ ${commands.length} comandos cargados\n`);

// Verificar cada comando
commands.forEach((cmd, i) => {
  console.log(`\n[${i + 1}/${commands.length}] ${cmd.name} (${cmd.file})`);
  
  try {
    const json = JSON.stringify(cmd.data);
    console.log(`  ✅ JSON válido (${json.length} bytes)`);
    
    if (json.length > 4000) {
      console.log(`  ⚠️  Muy grande (>${4000})`);
    }
  } catch (e) {
    console.log(`  ❌ NO es JSON válido:`, e.message);
  }

  // Verificar propiedades requeridas
  const data = cmd.data;
  if (!data.name) console.log(`  ⚠️  Falta name`);
  if (!data.description) console.log(`  ⚠️  Falta description`);
  if (!Array.isArray(data.options)) {
    console.log(`  ⚠️  options no es array`);
  } else {
    console.log(`  📋 ${data.options.length} opciones`);
  }
});

console.log('\n✅ Debug completo');
