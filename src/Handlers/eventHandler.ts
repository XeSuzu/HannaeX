import fs from 'fs';
import path from 'path';
import { HoshikoClient } from '../index'; // Importamos nuestra interfaz de cliente personalizada

// Definimos una "interfaz" para la estructura de nuestros archivos de evento.
// Esto le enseña a TypeScript qué esperar de cada archivo de evento.
interface EventFile {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => void;
}

export default (client: HoshikoClient) => {
    const eventsPath = path.join(__dirname, '../Events');

    // Leemos todas las carpetas dentro de /Events (Guilds, Client, etc.)
    // ✅ CORRECCIÓN: Cerramos correctamente el paréntesis del filter
    const eventFolders = fs.readdirSync(eventsPath).filter(folder =>
        fs.statSync(path.join(eventsPath, folder)).isDirectory()
    );

    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        
        // Ahora buscamos archivos .ts en lugar de .js
        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts'));

        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file);
            
            try {
                // Le decimos a TypeScript que el archivo importado debe cumplir con la interfaz EventFile
                const event: EventFile = require(filePath);

                // Validación: Verificamos que tenga las propiedades necesarias
                if (!event || !event.name || typeof event.execute !== "function") {
                    console.warn(`❌ [ERR] Estructura de evento inválida en ${file}: Falta 'name' o la función 'execute'.`);
                    continue;
                }

                // Si el evento tiene once: true, usamos .once(), si no, usamos .on()
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