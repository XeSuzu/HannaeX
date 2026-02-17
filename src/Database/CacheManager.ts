import ServerConfig, { IServerConfig } from "../Models/serverConfig";

interface CachedEntry {
  data: IServerConfig; // Los datos del servidor
  lastFetch: number; // Cuándo los leímos por última vez
}

export class CacheManager {
  // Caché en memoria para reducir lecturas a la base de datos
  private static cache = new Map<string, CachedEntry>();

  // TTL por defecto: 5 minutos
  private static TTL = 1000 * 60 * 5;

  /**
   * Devuelve la configuración del servidor, preferentemente desde memoria.
   * Si no existe o caducó, carga/crea desde la base de datos y actualiza la caché.
   */
  static async get(guildId: string): Promise<IServerConfig> {
    const now = Date.now();

    // Si está en memoria y no caducó, devolverla
    if (this.cache.has(guildId)) {
      const entry = this.cache.get(guildId)!;
      if (now - entry.lastFetch < this.TTL) return entry.data;
    }

    // En caso contrario, leer/crear en la DB
    let config = await ServerConfig.findOne({ guildId });

    // Si es un server nuevo y no tiene config, la creamos
    if (!config) {
      config = await ServerConfig.create({ guildId });
    }

    // C) Guardamos en memoria para la próxima vez
    this.cache.set(guildId, {
      data: config,
      lastFetch: now,
    });

    return config;
  }

  /**
   * Escribe la configuración en la base de datos y actualiza la caché en memoria.
   */
  static async update(
    guildId: string,
    updateData: any,
  ): Promise<IServerConfig | null> {
    // 1. Escribir en disco (MongoDB)
    const newConfig = await ServerConfig.findOneAndUpdate(
      { guildId },
      { $set: updateData },
      { new: true, upsert: true },
    );

    // 2. Actualizar memoria RAM inmediatamente
    if (newConfig) {
      this.cache.set(guildId, {
        data: newConfig,
        lastFetch: Date.now(), // Reseteamos el contador de tiempo
      });
    }

    return newConfig;
  }

  /**
   * Elimina la entrada de la caché para forzar una recarga desde DB.
   */
  static flush(guildId: string) {
    this.cache.delete(guildId);
  }
}
