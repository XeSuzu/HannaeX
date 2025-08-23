const path = require('path');
const fs = require('fs');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../Events');
    const eventFolders = fs.readdirSync(eventsPath);

    console.log('🔍 [DEBUG] Event folders found:', eventFolders);

    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        console.log(`🔍 [DEBUG] In folder ${folder}:`, eventFiles);

        for (const file of eventFiles) {
            console.log(`🔍 [DEBUG] Attempting to load event: ${folder}/${file}`);
            
            const filePath = path.join(folderPath, file);
            try {
                const event = require(filePath);

                // Comprobación más estricta de la estructura del evento
                if (!event || !event.name || typeof event.execute !== 'function') {
                    console.warn(`❌ [ERR] Invalid event structure in ${file}: Missing 'name' or 'execute' function.`);
                    continue; // Pasa al siguiente archivo
                }

                // Registro del evento
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }

                console.log(`✅ [INFO] Loaded event: ${event.name}`);

            } catch (error) {
                console.error(`❌ [ERR] Error loading event ${file}:`, error.message);
                // console.error('Full error:', error); // Descomentar para depuración
            }
        }
    }
};