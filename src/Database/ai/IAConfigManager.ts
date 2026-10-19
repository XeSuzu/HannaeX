import { CacheManager } from "../guild/CacheManager";
import { PremiumManager } from "../guild/PremiumManager";
import { IServerConfig } from "../guild/serverConfig.model";

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

  // Gestión de canales espontáneos: deshabilitado por mantenimiento hasta nuevo aviso
  static async toggleSpontaneousChannel(
    guildId: string,
    channelId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Si ya estaba en la lista, permitir removerlo
    const config = await this.getConfig(guildId);
    let channels = config.aiSystem.spontaneousChannels || [];
    const exists = channels.includes(channelId);

    if (exists) {
      channels = channels.filter((c) => c !== channelId);
      await CacheManager.update(guildId, {
        "aiSystem.spontaneousChannels": channels,
      });
      return {
        success: true,
        message: "❌ **Modo Libre desactivado** en este canal.",
      };
    }

    return {
      success: false,
      message:
        "⚠️ **Conversación espontánea desactivada:** Esta función se encuentra temporalmente en mantenimiento hasta nuevo aviso. Puedes seguir interactuando mencionando a Hoshiko o usando `hoshi ask`.",
    };
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
