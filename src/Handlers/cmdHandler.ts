import path from 'path';
import fs from 'fs';
import { HoshikoClient } from '../index';

interface CommandFile {
  name?: string;
  data?: any;
  execute: (...args: any[]) => void;
}

// --- FUNCIÓN RECURSIVA: Busca archivos en todos los niveles 🌸 ---
function getFilesRecursively(directory: string): string[] {
    let files: string[] = [];
    if (!fs.existsSync(directory)) return files;

    const items = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
            files = files.concat(getFilesRecursively(fullPath));
        } else if (item.isFile()) {
            const ext = path.extname(item.name);
            // ✨ Aceptamos .ts y .js para evitar errores de entorno
            if (['.ts', '.js'].includes(ext) && !item.name.endsWith('.js.map') && !item.name.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function loadCommands(directoryPath: string): CommandFile[] {
  const commands: CommandFile[] = [];
  const allFiles = getFilesRecursively(directoryPath);
 
  console.log(`[CMD HANDLER] Escaneando: ${directoryPath} (${allFiles.length} archivos encontrados)`);
 
    for (const filePath of allFiles) {
      try {
        const mod = require(path.resolve(filePath));
        const command: CommandFile = mod.default || mod;
 
        if (command && typeof command.execute === 'function') {
          commands.push(command);
        }
      } catch (err: any) {
        console.error(`❌ Error al cargar ${filePath}:`, err.message);
      }
    }
  return commands;
}
 
export default (client: HoshikoClient) => {
  // 1. Cargar comandos de Prefijo (!)
  const prefixPath = path.join(__dirname, '../Commands/PrefixCmds');
  const prefixCommands = loadCommands(prefixPath);
  for (const c of prefixCommands) {
    if (c.name) client.commands.set(c.name, c);
  }
  console.log(`📜 Prefijo cargados: ${client.commands.size}`);

  // 2. Cargar Slash Commands (/)
  const slashPath = path.join(__dirname, '../Commands/SlashCmds');
  const slashCommands = loadCommands(slashPath);

  for (const command of slashCommands) {
    const data = command.data;
    if (!data) continue;

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      const json = (typeof item.toJSON === 'function') ? item.toJSON() : item;
      const name: string = json.name;

      if (name) {
        client.slashCommands.set(name, command);
      }
    }
  }

  console.log(`✨ Slash cargados: ${client.slashCommands.size}`);
};