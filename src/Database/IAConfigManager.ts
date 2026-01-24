import ServerConfig, { IServerConfig } from '../Models/serverConfig';
import { PremiumManager } from '../Database/PremiumManager'; // 👈 IMPORTANTE: Conexión con el sistema Premium

export type IAConfig = Omit<IServerConfig, keyof import('mongoose').Document>;
const iaCache = new Map<string, IAConfig>();

export class IAConfigManager {
    
    // --- OBTENER CONFIGURACIÓN (Con Parche Legacy) ---
    static async getConfig(guildId: string): Promise<IAConfig> {
        if (iaCache.has(guildId)) return iaCache.get(guildId)!;

        try {
            const doc = await ServerConfig.findOne({ guildId }).lean();
            let config: IAConfig;

            if (!doc) {
                // Crear config nueva si no existe
                const newDoc = await ServerConfig.create({ 
                    guildId, 
                    memeChannelId: '0',
                    premiumUntil: null,
                    aiSystem: {
                        mode: 'neko',
                        customPersona: '',
                        randomChance: 3,
                        cooldownUntil: new Date(),
                        spontaneousChannels: [] // Empieza modo "Bot Normal"
                    }
                });
                config = JSON.parse(JSON.stringify(newDoc.toObject())) as IAConfig;
            } else {
                config = doc as unknown as IAConfig;
                
                // 🛡️ PARCHE LEGACY: Si el server es viejo y no tiene el sistema nuevo
                if (!config.aiSystem) {
                    config.aiSystem = {
                        mode: 'neko',
                        customPersona: '',
                        randomChance: 3,
                        cooldownUntil: new Date(),
                        spontaneousChannels: []
                    };
                }
            }

            iaCache.set(guildId, config);
            return config;
        } catch (error) {
            console.error(`[CRITICAL IA-CONFIG] Fallo en ${guildId}:`, error);
            return this.getFallbackConfig(guildId);
        }
    }

    // --- ⚡ SISTEMA DE ENERGÍA (DORMIR) ---
    static async setCooldown(guildId: string, minutes: number) {
        const wakeUpTime = new Date();
        wakeUpTime.setMinutes(wakeUpTime.getMinutes() + minutes);

        const updated = await ServerConfig.findOneAndUpdate(
            { guildId },
            { $set: { 'aiSystem.cooldownUntil': wakeUpTime } },
            { new: true, lean: true }
        ) as unknown as IAConfig;

        if (updated) iaCache.set(guildId, updated);
        return updated;
    }

    // --- 📺 GESTIÓN DE CANALES (Lógica Premium Interna) ---
    // Ya no pedimos 'isPremium' como argumento, lo calculamos aquí dentro por seguridad
    static async toggleSpontaneousChannel(guildId: string, channelId: string): Promise<{ success: boolean; message: string }> {
        // 1. Verificar Status Premium REAL
        const isPremium = await PremiumManager.isPremium(guildId);
        
        const config = await this.getConfig(guildId);
        const channels = config.aiSystem.spontaneousChannels || [];
        const exists = channels.includes(channelId);

        if (exists) {
            // DESACTIVAR (Siempre permitido)
            await ServerConfig.updateOne({ guildId }, { $pull: { 'aiSystem.spontaneousChannels': channelId } });
            
            // Actualizar caché
            const cached = iaCache.get(guildId);
            if (cached && cached.aiSystem?.spontaneousChannels) {
                cached.aiSystem.spontaneousChannels = cached.aiSystem.spontaneousChannels.filter(c => c !== channelId);
            }
            return { success: true, message: "❌ **Modo Libre desactivado** en este canal. Hoshiko volverá a ser un bot normal aquí." };
        } else {
            // ACTIVAR (Aquí aplicamos los límites)
            const limit = isPremium ? 6 : 1;
            
            if (channels.length >= limit) {
                return { 
                    success: false, 
                    message: isPremium 
                        ? `🚫 Has alcanzado el límite máximo de ${limit} canales activos.` 
                        : `🚫 El plan Gratuito solo permite **1 canal** de Modo Libre.\n💎 Mejora a Premium para activar hasta 6 canales simultáneos.` 
                };
            }

            await ServerConfig.updateOne({ guildId }, { $push: { 'aiSystem.spontaneousChannels': channelId } });
            
            // Actualizar caché
            const cached = iaCache.get(guildId);
            if (cached) {
                if (!cached.aiSystem.spontaneousChannels) cached.aiSystem.spontaneousChannels = [];
                cached.aiSystem.spontaneousChannels.push(channelId);
            }
            return { success: true, message: "✅ **Modo Libre activado.** Hoshiko ahora participará espontáneamente en este canal." };
        }
    }

    // --- MÉTODOS DE SOPORTE (Legacy) ---
    static async updateConfig(guildId: string, data: any): Promise<IAConfig> {
        const updated = await ServerConfig.findOneAndUpdate({ guildId }, { $set: data }, { new: true, upsert: true, lean: true }) as unknown as IAConfig;
        iaCache.set(guildId, updated);
        return updated;
    }

    static async addSlang(guildId: string, slang: { word: string; meaning: string; addedBy: string }) {
        const updated = await ServerConfig.findOneAndUpdate({ guildId }, { $push: { 'culture.slangs': slang } }, { new: true, lean: true }) as unknown as IAConfig;
        iaCache.set(guildId, updated);
        return updated;
    }

    static async addMemory(guildId: string, memory: { content: string; participants: string[] }) {
        const updated = await ServerConfig.findOneAndUpdate(
            { guildId },
            { $push: { shortTermMemory: { ...memory, timestamp: new Date() } }, $slice: { shortTermMemory: -15 } },
            { new: true, lean: true }
        ) as unknown as IAConfig;
        iaCache.set(guildId, updated);
        return updated;
    }

    private static getFallbackConfig(guildId: string): IAConfig {
        return { 
            guildId, aiMode: 'calmado', aiSafety: 'standard', premiumUntil: null,
            aiSystem: { mode: 'neko', customPersona: '', randomChance: 0, cooldownUntil: new Date(), spontaneousChannels: [] },
            culture: { slangs: [], visualLibrary: [] }, socialMap: { trustLevels: new Map() }, shortTermMemory: [] 
        } as any;
    }
}