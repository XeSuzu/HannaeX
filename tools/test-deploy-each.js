/* Temporary helper: intenta crear cada comando individualmente para encontrar el que falla */
const axios = require('axios')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { TOKEN, BOT_ID, GUILD_ID, GUILD_IDS } = process.env
if (!TOKEN || !BOT_ID) {
  console.error('Falta TOKEN o BOT_ID en .env')
  process.exit(1)
}

let guildId = GUILD_ID
if (!guildId && GUILD_IDS) {
  const arr = GUILD_IDS.trim().startsWith('[') ? JSON.parse(GUILD_IDS) : GUILD_IDS.split(',').map(s=>s.trim())
  guildId = arr[0]
}
if (!guildId) {
  console.error('Falta GUILD_ID o GUILD_IDS en .env')
  process.exit(1)
}

const instance = axios.create({ baseURL: 'https://discord.com/api/v10', headers: { Authorization: `Bot ${TOKEN}` }, timeout: 120000 })

const distPath = path.resolve(process.cwd(), 'dist/Commands/SlashCmds')
function loadCommands(dir) {
  const list = []
  if (!fs.existsSync(dir)) return list
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name)
    if (f.isDirectory()) {
      list.push(...loadCommands(full))
      continue
    }
    if (!f.name.endsWith('.js')) continue
    try {
      delete require.cache[require.resolve(full)]
      const mod = require(full)
      const cmd = mod.default || mod
      if (!cmd?.data) continue
      let data = cmd.data
      if (typeof data.toJSON === 'function') data = data.toJSON()
      if (data && data.name) list.push({ file: f.name, data })
    } catch (e) {
      console.error('Error cargando', f.name, e.message||e)
    }
  }
  return list
}

;(async ()=>{
  const cmds = loadCommands(distPath)
  console.log('Encontrados', cmds.length, 'comandos. Probando en', guildId)
  for (const c of cmds) {
    try {
      console.log('\n-> Probando:', c.file, c.data.name)
      const res = await instance.post(`/applications/${BOT_ID}/guilds/${guildId}/commands`, c.data)
      console.log('  OK:', res.status)
      // opcional: borrar comando creado para evitar duplicados
      try {
        await instance.delete(`/applications/${BOT_ID}/guilds/${guildId}/commands/${res.data.id}`)
        console.log('  (eliminado)')
      } catch (e) {}
    } catch (err) {
      console.error('  ERROR:', err.response?.status)
      console.error('  BODY:', JSON.stringify(err.response?.data, null, 2))
      process.exit(1)
    }
  }
  console.log('\nTodas las pruebas completadas sin errores detectados al crear individualmente.')
})()
