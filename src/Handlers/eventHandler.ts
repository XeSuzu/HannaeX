import fs from 'fs';
import path from 'path';
import { HoshikoClient } from '../index';

interface EventFile {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void;
}

// Función auxiliar para buscar eventos en todos los niveles 🌊
function getFilesRecursively(directory: string, extensions: string[]): string[] {
  let files: string[] = [];
  if (!fs.existsSync(directory)) return files;

  const items = fs.readdirSync(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      files = [...files, ...getFilesRecursively(fullPath, extensions)];
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext) && !item.name.endsWith('.js.map') && !item.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export default (client: HoshikoClient) => {
  const eventsPath = path.join(__dirname, '../Events');
  
  // Detectamos extensiones según el entorno (igual que en comandos ✨)
  const isTs = !!process.env.TS_NODE || !!process.env.TS_NODE_DEV || process.execArgv.some(a => a.includes('ts-node'));
  const allowedExts = isTs ? ['.ts'] : ['.js'];

  const allEventFiles = getFilesRecursively(eventsPath, allowedExts);

  console.log(`✨ [EVENT HANDLER] Iniciando carga de ${allEventFiles.length} archivos de eventos...`);

  for (const filePath of allEventFiles) {
    try {
      // Manejamos el require de forma segura para TS/JS
      const mod = require(path.resolve(filePath));
      const event: EventFile = mod.default || mod;
      
      if (!event || !event.name || typeof event.execute !== "function") {
        console.warn(`⚠️ [EVENT HANDLER] Estructura inválida en ${path.basename(filePath)}: Falta 'name' o 'execute'.`);
        continue;
      }

      // Evitamos duplicar listeners si recargas el handler
      client.removeAllListeners(event.name);

      if (event.once) {
        client.once(event.name, (...args: any[]) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args: any[]) => event.execute(...args, client));
      }
      
      const relativePath = path.relative(eventsPath, filePath);
      console.log(`   ✅ Evento cargado: ${event.name} (${relativePath})`);
      
    } catch (error: any) {
      console.error(`   ❌ Error cargando el evento en ${filePath}:`, error.message);
    }
  }
};