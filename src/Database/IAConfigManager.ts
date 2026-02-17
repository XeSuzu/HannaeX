import { CacheManager } from "./CacheManager";
import { PremiumManager } from "../Database/PremiumManager";
import { IServerConfig } from "../Models/serverConfig";

// Tipo de ayuda para no escribir todo el tiempo
export type IAConfig = IServerConfig;

export class IAConfigManager {
  // Devuelve configuración del servidor desde caché/DB y asegura estructura mínima de IA
  static async getConfig(guildId: string): Promise<IAConfig> {
    const config = await CacheManager.get(guildId);

    // Asegurar estructura `aiSystem` para compatibilidad con servidores antiguos
    if (!config.aiSystem) {
      config.aiSystem = {
        mode: "neko",
        customPersona: "",
        behavior: "normal",
        randomChance: 3,
        cooldownUntil: new Date(),
        spontaneousChannels: [],
      };
      // Guardar corrección en caché/DB sin bloquear
      CacheManager.update(guildId, { aiSystem: config.aiSystem });
    }

    return config;
  }

  // Establece cooldown del sistema de IA (hora de reactivación)
  static async setCooldown(guildId: string, minutes: number) {
    const wakeUpTime = new Date();
    wakeUpTime.setMinutes(wakeUpTime.getMinutes() + minutes);

    // Actualizamos usando el CacheManager
    return await CacheManager.update(guildId, {
      "aiSystem.cooldownUntil": wakeUpTime,
    });
  }

  // Gestión de canales espontáneos: activa/desactiva canal para charla libre
  static async toggleSpontaneousChannel(
    guildId: string,
    channelId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Obtener configuración desde caché para trabajar en memoria
    const config = await this.getConfig(guildId);
    const isPremium = await PremiumManager.isPremium(guildId);

    // Trabajamos con arrays en memoria (Mucho más rápido que $pull/$push de Mongo)
    let channels = config.aiSystem.spontaneousChannels || [];
    const exists = channels.includes(channelId);

    if (exists) {
      // DESACTIVAR: Filtramos el array en JS
      channels = channels.filter((c) => c !== channelId);

      // Guardamos el nuevo array completo
      await CacheManager.update(guildId, {
        "aiSystem.spontaneousChannels": channels,
      });

      return {
        success: true,
        message: "❌ **Modo Libre desactivado** en este canal.",
      };
    } else {
      // ACTIVAR: Verificamos límites
      const limit = isPremium ? 6 : 1;

      if (channels.length >= limit) {
        return {
          success: false,
          message: isPremium
            ? `🚫 Has alcanzado el límite máximo de ${limit} canales activos.`
            : `🚫 El plan Gratuito solo permite **1 canal** de Modo Libre.\n💎 Mejora a Premium para activar hasta 6 canales simultáneos.`,
        };
      }

      // Agregamos al array local
      channels.push(channelId);

      // Guardamos
      await CacheManager.update(guildId, {
        "aiSystem.spontaneousChannels": channels,
      });

      return {
        success: true,
        message:
          "✅ **Modo Libre activado.** Hoshiko hablará aquí espontáneamente.",
      };
    }
  }

  // --- ACTUALIZACIÓN GENÉRICA ---
  static async updateConfig(
    guildId: string,
    data: any,
  ): Promise<IAConfig | null> {
    return await CacheManager.update(guildId, data);
  }

  // --- MEMORIA DE CULTURA (Optimizado) ---
  static async addSlang(
    guildId: string,
    slang: { word: string; meaning: string; addedBy: string },
  ) {
    const config = await this.getConfig(guildId);
    const currentSlangs = config.culture?.slangs || [];

    // Modificamos en memoria
    currentSlangs.push(slang);

    // Guardamos
    return await CacheManager.update(guildId, {
      "culture.slangs": currentSlangs,
    });
  }

  // --- MEMORIA A CORTO PLAZO (Optimizado) ---
  static async addMemory(
    guildId: string,
    memory: { content: string; participants: string[] },
  ) {
    const config = await this.getConfig(guildId);
    let currentMemory = config.shortTermMemory || [];

    // Agregamos la nueva memoria
    currentMemory.push({ ...memory, timestamp: new Date() });

    // Lógica de Slice ($slice -15) hecha en JS puro
    // Si hay más de 15, quitamos los viejos del principio
    if (currentMemory.length > 15) {
      currentMemory = currentMemory.slice(-15);
    }

    // Guardamos el array limpio
    return await CacheManager.update(guildId, {
      shortTermMemory: currentMemory,
    });
  }
}
