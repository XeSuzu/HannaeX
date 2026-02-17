const axios = require('axios')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const { TOKEN, BOT_ID, GUILD_ID, GUILD_IDS } = process.env
if (!TOKEN || !BOT_ID) {
  console.error('Falta TOKEN o BOT_ID en .env')
  process.exit(1)
}

let guildIds = []
if (GUILD_IDS) {
  try {
    const t = GUILD_IDS.trim()
    guildIds = t.startsWith('[') ? JSON.parse(t) : t.split(',').map(s=>s.trim()).filter(Boolean)
  } catch (e) { guildIds = GUILD_IDS.split(',').map(s=>s.trim()).filter(Boolean) }
} else if (GUILD_ID) guildIds = [GUILD_ID]

if (!guildIds.length) {
  console.error('Falta GUILD_ID o GUILD_IDS en .env')
  process.exit(1)
}

const instance = axios.create({ baseURL: 'https://discord.com/api/v10', headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' }, timeout: 120000 })

const distPath = path.resolve(process.cwd(), 'dist/Commands/SlashCmds/Fun')
const file = path.join(distPath, 'translate.js')
if (!fs.existsSync(file)) {
  console.error('No encontre dist/Commands/SlashCmds/Fun/translate.js — asegurate de compilar primero')
  process.exit(1)
}

const mod = require(file)
const cmd = mod.default || mod
let data = cmd.data
if (typeof data.toJSON === 'function') data = data.toJSON()
if (!data || !data.name) {
  console.error('Comando translate inválido en dist')
  process.exit(1)
}

;(async ()=>{
  for (const gid of guildIds) {
    try {
      console.log(`Subiendo '/${data.name}' a ${gid}...`)
      const res = await instance.post(`/applications/${BOT_ID}/guilds/${gid}/commands`, data)
      console.log(`  OK ${res.status} -> id: ${res.data.id}`)
      // esperar 1s para evitar rate limits
      await new Promise(r=>setTimeout(r, 1000))
    } catch (err) {
      console.error('  ERROR:', err.response?.status)
      console.error('  BODY:', JSON.stringify(err.response?.data, null, 2))
      process.exit(1)
    }
  }
  console.log('Despliegue de /translate completado.')
})()
