const path = require('path');
const fs = require('fs');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../Events');
    const eventFolders = fs.readdirSync(eventsPath);

    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file);
            const event = require(filePath);

            if (!event.name || typeof event.execute !== 'function') {
                console.warn(`[ERR] Skipping invalid event file: ${file}`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            console.log(`[INFO] Loaded event: ${event.name}`);
        }
    }
};
