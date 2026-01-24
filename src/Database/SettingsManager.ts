import GuildConfig from '../Models/GuildConfig';

// Usamos una interfaz para asegurar que los datos siempre tengan la estructura correcta
export interface IGuildSettings {
    guildId: string;
    prefix?: string; // 👈 Agregado
    modLogChannel?: string;
    honeypotChannel?: string; // 👈 Agregado
    allowedLinks?: string[]; // 👈 Agregado
    pointsPerStrike: number;
    autoActions?: any[]; // 👈 Agregado (InfractionManager)
    securityModules: {
        antiRaid: boolean;
        antiNuke: boolean;
        antiAlt: boolean;
        antiLinks: boolean;
    };
    // ... otros campos
}

const settingsCache = new Map<string, IGuildSettings>();

export class SettingsManager {
    /**
     * Obtiene ajustes con persistencia de seguridad.
     */
    static async getSettings(guildId: string): Promise<IGuildSettings> {
        // 1. Prioridad: RAM (Velocidad instantánea)
        if (settingsCache.has(guildId)) {
            return settingsCache.get(guildId)!;
        }

        try {
            // 2. Fallback: MongoDB con .lean() para rendimiento
            let config = await GuildConfig.findOne({ guildId }).lean() as IGuildSettings | null;

            if (!config) {
                // 3. Autocuración: Si no existe, lo crea inmediatamente
                const newDoc = await GuildConfig.create({ guildId });
                config = newDoc.toObject() as IGuildSettings;
            }

            // 4. Inyección en Caché
            settingsCache.set(guildId, config);
            return config;
        } catch (error) {
            console.error(`[CRITICAL] Error recuperando settings para ${guildId}:`, error);
            
            // 5. Robustez extrema: Si la DB cae, intentamos devolver un objeto mínimo viable
            // para que el bot no crashee.
            return {
                guildId,
                pointsPerStrike: 10,
                securityModules: { antiRaid: false, antiNuke: false, antiAlt: false, antiLinks: false }
            } as IGuildSettings;
        }
    }

    /**
     * Actualización Atómica y Sincronización de Caché.
     */
    static async updateSettings(guildId: string, data: Partial<IGuildSettings>): Promise<IGuildSettings> {
        try {
            // Usamos findOneAndUpdate con validación de esquema
            const updated = await GuildConfig.findOneAndUpdate(
                { guildId }, 
                { $set: data }, 
                { new: true, upsert: true, runValidators: true }
            ).lean() as IGuildSettings;

            // Sincronización inmediata con la memoria
            settingsCache.set(guildId, updated);
            
            return updated;
        } catch (error) {
            console.error(`[ERROR] Fallo al actualizar settings de ${guildId}:`, error);
            throw new Error("No se pudo persistir la configuración en la base de datos.");
        }
    }

    /**
     * Fuerza la sincronización total de un servidor (Re-hidratación)
     */
    static async refresh(guildId: string): Promise<void> {
        settingsCache.delete(guildId);
        await this.getSettings(guildId);
    }
}