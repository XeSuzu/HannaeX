import path from 'path';
import fs from 'fs';
import { HoshikoClient } from '../index';

interface CommandFile {
  name?: string;
  data?: any;
  execute: (...args: any[]) => void;
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

// --- FUNCIÓN RECURSIVA: Busca archivos en todos los niveles 🌸 ---
function getFilesRecursively(directory: string, extensions: string[]): string[] {
    let files: string[] = [];
    if (!fs.existsSync(directory)) return files;

    const items = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
            files = files.concat(getFilesRecursively(fullPath, extensions));
        } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (extensions.includes(ext) && !item.name.endsWith('.js.map') && !item.name.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function loadCommands(directoryPath: string): CommandFile[] {
  const commands: CommandFile[] = [];
  if (!fs.existsSync(directoryPath)) {
    console.warn(`⚠️ Directorio de comandos no existe: ${directoryPath}`);
    return commands;
  }
  
  const exts = allowedExts();
  const allFiles = getFilesRecursively(directoryPath, exts);
 
  console.log(`[CMD HANDLER] Escaneando: ${directoryPath} (${allFiles.length} archivos encontrados con extensiones ${exts.join(', ')})`);
 
    for (const filePath of allFiles) {
      try {
        // Limpiamos cache por si quieres hacer "reload" después
        delete require.cache[require.resolve(filePath)];
        const mod = require(path.resolve(filePath));
        const command: CommandFile = mod.default || mod;
 
        if (command && typeof command.execute === 'function') {
          commands.push(command);
        } else {
          console.warn(`⚠️ El archivo ${path.basename(filePath)} no exporta una función 'execute'. Omitido.`);
        }
      } catch (err: any) {
        console.error(`❌ Error al cargar ${filePath}:`, err?.stack ?? err?.message ?? err);
      }
    }
 
  if (commands.length === 0) {
    console.warn('⚠️ No se detectaron comandos al cargar. Verifica que los ficheros existan en la carpeta de salida (ej: dist/Commands) y que tengan la extensión correcta.');
  }
  
  return commands;
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

  // Evita duplicados por nombre de comando
  const seen = new Set<string>();

  for (const command of slashCommands) {
    const data = command.data;
    if (!data) continue;

    // data puede ser objeto o array (slash + context)
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      // MEJORA: Aceptar builders (.toJSON) y objetos JSON ya serializados.
      const json = (typeof item.toJSON === 'function') ? item.toJSON() : item;
      const name: string = json.name;

      if (!name) continue;

      if (seen.has(name)) {
        console.warn(`[slash] DUPLICADO detectado: /${name} — omitido`);
        continue;
      }

      seen.add(name);
      client.slashCommands.set(name, command);
    }
  }

  console.log(`✨ Slash cargados (únicos): ${client.slashCommands.size}`);
};
