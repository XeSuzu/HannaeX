import GuildConfig from '../Models/GuildConfig';

// Usamos un Map para guardar las configuraciones en RAM temporalmente
const settingsCache = new Map<string, any>();

export class SettingsManager {
    /**
     * Obtiene la configuración de un servidor. 
     * Si no existe en caché, la busca en la DB.
     * Si no existe en la DB, crea una por defecto.
     */
    static async getSettings(guildId: string) {
        // 1. Intentar sacar de la memoria rápida (RAM)
        if (settingsCache.has(guildId)) {
            return settingsCache.get(guildId);
        }

        // 2. Si no está, buscar en MongoDB
        let config = await GuildConfig.findOne({ guildId });

        // 3. Si es un servidor nuevo, crear su perfil inicial
        if (!config) {
            config = await GuildConfig.create({ guildId });
        }

        // 4. Guardar en caché para la próxima vez y devolver
        settingsCache.set(guildId, config);
        return config;
    }

    /**
     * Limpia el caché de un servidor específico 
     * (Útil cuando el dueño cambia una configuración)
     */
    static clearCache(guildId: string) {
        settingsCache.delete(guildId);
    }
}