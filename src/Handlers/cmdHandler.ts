import path from 'path';
import fs from 'fs';
import { REST, Routes, Client } from 'discord.js';
import { HoshikoClient } from '../index';

interface CommandFile {
  name?: string;   
  data?: any;      
  execute: (...args: any[]) => void;
}

interface RegistrationSummary {
  registered: { [guildId: string]: string[] };
  failed: { guildId: string; error: string }[];
}

// Detecta entorno: dev (ts-node) vs prod (node dist)
function runningTs(): boolean {
  return !!process.env.TS_NODE_DEV
      || !!process.env.TS_NODE
      || process.execArgv.some(a => a.includes('ts-node'));
}

// Extensiones a cargar según entorno
function allowedExts(): string[] {
  return runningTs() ? ['.ts'] : ['.js'];
}

// Lee comandos de un directorio (carpetas 1 nivel)
function loadCommands(directoryPath: string): CommandFile[] {
  const commands: CommandFile[] = [];
  if (!fs.existsSync(directoryPath)) {
    console.warn(`⚠️ El directorio de comandos no existe: ${directoryPath}`);
    return commands;
  }

  const folders = fs.readdirSync(directoryPath);
  const exts = allowedExts();

  for (const folder of folders) {
    const folderPath = path.join(directoryPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs
      .readdirSync(folderPath)
      .filter(file => exts.includes(path.extname(file)) && !file.endsWith('.d.ts'));

    console.log(`[CMD HANDLER] Carpeta ${folder}: ${files.length} archivo(s) válidos (${exts.join(', ')})`);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        // require CJS funciona en dev (ts-node register) y prod (dist)
        const mod = require(filePath);
        const command: CommandFile = mod.default || mod;

        if (command && typeof command.execute === 'function') {
          commands.push(command);
        } else {
          console.warn(`⚠️ ${file} no exporta 'execute'. Omitido.`);
        }
      } catch (err: any) {
        console.error(`❌ Error al cargar ${filePath}:`, err?.message ?? err);
      }
    }
  }

  return commands;
}

async function registerSlashCommands(client: HoshikoClient, slashCommandsData: any[]) {
  const { config } = client;
  if (!Array.isArray(config.guildIds) || config.guildIds.length === 0) {
    console.warn('⚠️ No hay guildIds en la config. Se omite el registro de slash commands.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.token!);
  const summary: RegistrationSummary = { registered: {}, failed: [] };

  for (const guildId of config.guildIds) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(config.BotId!, guildId),
        { body: slashCommandsData }
      );
      summary.registered[guildId] = slashCommandsData.map(c => c.name);
    } catch (error: any) {
      summary.failed.push({ guildId, error: error?.message ?? String(error) });
      console.error(`❌ Falló el registro en ${guildId}:`, error?.message ?? error);
    }
  }

  logRegistrationSummary(client, summary, slashCommandsData.length);
}

function logRegistrationSummary(client: Client, summary: RegistrationSummary, totalCommands: number) {
  const out: string[] = ['🌸✨ ¡Registro de comandos completado!'];

  for (const gid in summary.registered) {
    const g = client.guilds.cache.get(gid);
    out.push(`\n💮 "${g?.name ?? 'Servidor desconocido'}" (${gid}):`);
    summary.registered[gid].forEach(n => out.push(`   - /${n}`));
  }

  if (summary.failed.length > 0) {
    out.push('\n⚠️ Registros fallidos:');
    summary.failed.forEach(f => out.push(`   - ${f.guildId}: ${f.error}`));
  }

  out.push(`\nTotal enviados: ${totalCommands}`);
  out.push(`Servidores OK: ${Object.keys(summary.registered).length} | Fallidos: ${summary.failed.length}`);
  console.log(out.join('\n'));
}

// ===== Export principal =====
export default (client: HoshikoClient) => {
  // --- Prefijo ---
  const prefixPath = path.join(__dirname, '../Commands/PrefixCmds');
  const prefixCommands = loadCommands(prefixPath);
  for (const c of prefixCommands) {
    if (c.name) client.commands.set(c.name, c);
  }
  console.log(`📜 Prefijo cargados: ${client.commands.size}`);

  // --- Slash ---
  const slashPath = path.join(__dirname, '../Commands/SlashCmds');
  const slashCommands = loadCommands(slashPath);
  const slashToRegister: any[] = [];

  // Evita duplicados por nombre de comando
  const seen = new Set<string>();

  for (const command of slashCommands) {
    const data = command.data;
    if (!data) continue;

    // data puede ser objeto o array (slash + context)
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (!item || typeof item.toJSON !== 'function') continue;

      const json = item.toJSON();
      const name: string = json.name;
      if (!name) continue;

      if (seen.has(name)) {
        console.warn(`[slash] DUPLICADO detectado: /${name} — omitido`);
        continue;
      }

      seen.add(name);
      client.slashCommands.set(name, command);
      slashToRegister.push(json);
    }
  }

  console.log(`✨ Slash cargados (únicos): ${client.slashCommands.size}`);

  client.once('ready', () => {
    console.log('[COMMAND HANDLER] ready → registrando slash commands…');
    if (slashToRegister.length > 0) registerSlashCommands(client, slashToRegister);
    else console.warn('⚠️ No hay slash commands para registrar');
  });
};
