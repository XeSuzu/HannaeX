const path = require('path');
const fs = require('fs');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../Events');
    
    // 1. Obtiene la lista de todos los archivos y carpetas
    const eventFilesAndFolders = fs.readdirSync(eventsPath);

    console.log('🔍 [DEBUG] Event files and folders found:', eventFilesAndFolders);

    // 2. Procesa los archivos que están directamente en la carpeta Events
    const topLevelEventFiles = eventFilesAndFolders.filter(file => file.endsWith('.js'));
    for (const file of topLevelEventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            if (!event || !event.name || typeof event.execute !== 'function') {
                console.warn(`❌ [ERR] Invalid event structure in ${file}: Missing 'name' or 'execute' function.`);
                continue;
            }
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ [INFO] Loaded top-level event: ${event.name}`);
        } catch (error) {
            console.error(`❌ [ERR] Error loading top-level event ${file}:`, error.message);
        }
    }

    // 3. Procesamiento de carpetas dentro de Events 
    const eventFolders = eventFilesAndFolders.filter(folder => fs.statSync(path.join(eventsPath, folder)).isDirectory());
    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            console.log(`🔍 [DEBUG] Attempting to load event from folder: ${folder}/${file}`);
            const filePath = path.join(folderPath, file);
            try {
                const event = require(filePath);
                if (!event || !event.name || typeof event.execute !== 'function') {
                    console.warn(`❌ [ERR] Invalid event structure in ${file}: Missing 'name' or 'execute' function.`);
                    continue;
                }
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                console.log(`✅ [INFO] Loaded event from folder: ${event.name}`);
            } catch (error) {
                console.error(`❌ [ERR] Error loading event ${file}:`, error.message);
            }
        }
    }
};