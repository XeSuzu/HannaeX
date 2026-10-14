const { REST, Routes } = require('discord.js');
require('dotenv/config');

const TOKEN = process.env.TOKEN;
const BOT_ID = process.env.BOT_ID;

if (!TOKEN || !BOT_ID) {
  console.error('❌ Faltan TOKEN o BOT_ID');
  process.exit(1);
}

console.log('🔍 Probando conexión con Discord...\n');

const rest = new REST({ version: '10', timeout: 120000 }).setToken(TOKEN);

(async () => {
  try {
    console.log('⏳ Obteniendo usuario actual...');
    const user = await rest.get(`/users/@me`);
    console.log(`✅ Conectado como: ${user.username} (ID: ${user.id})\n`);
    
    console.log('⏳ Obteniendo aplicación actual...');
    const app = await rest.get(`/applications/@me`);
    console.log(`✅ Aplicación: ${app.name} (ID: ${app.id})\n`);
    
    console.log('✅ CREDENCIALES VÁLIDAS\n');
    console.log('El problema NO es el TOKEN o credenciales.');
    console.log('El problema está en la solicitud PUT de comandos.');
    
  } catch (error) {
    console.error('❌ ERROR DE CREDENCIALES:');
    console.error('Status:', error.status);
    console.error('Mensaje:', error.message);
    console.error('Detalle:', error.rawError?.message || error.rawError);
    process.exit(1);
  }
})();
