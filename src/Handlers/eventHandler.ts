import fs from 'fs';
import path from 'path';
import { HoshikoClient } from '../index';

interface EventFile {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void;
}

export default (client: HoshikoClient) => {
  const eventsPath = path.join(__dirname, '../Events');
  
  const eventFolders = fs.readdirSync(eventsPath).filter(folder =>
    fs.statSync(path.join(eventsPath, folder)).isDirectory()
  );

  for (const folder of eventFolders) {
    const folderPath = path.join(eventsPath, folder);
    
    // ✅ CORRECCIÓN: Busca archivos .ts Y .js
    const eventFiles = fs.readdirSync(folderPath).filter(file => {
      const ext = path.extname(file);
      return ext === '.ts' || ext === '.js';
    });

    for (const file of eventFiles) {
      const filePath = path.join(folderPath, file);
      
      try {
        const event: EventFile = require(filePath);
        
        if (!event || !event.name || typeof event.execute !== "function") {
          console.warn(`❌ [ERR] Estructura de evento inválida en ${file}: Falta 'name' o la función 'execute'.`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args: any[]) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args: any[]) => event.execute(...args, client));
        }
        
        console.log(`✅ [INFO] Evento cargado: ${event.name}`);
      } catch (error: any) {
        console.error(`❌ [ERR] Error cargando el evento ${file}:`, error.message);
      }
    }
  }
};