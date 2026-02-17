import { CacheManager } from "./CacheManager";
import { IServerConfig } from "../Models/serverConfig";
import ServerConfig from "../Models/serverConfig";

export class SettingsManager {
  /**
   * Obtiene la configuración COMPLETA del servidor.
   * Ideal cuando vas a usar muchos datos o modificar algo.
   * Usa la Caché RAM principal.
   */
  static async getSettings(guildId: string): Promise<IServerConfig> {
    return await CacheManager.get(guildId);
  }

  /**
   * 🚀 NUEVO: Obtiene SOLO una parte de la configuración.
   * Ideal para eventos rápidos (InteractionCreate, MessageCreate).
   * @param fields Campos a traer (ej: 'confessions prefix')
   * @returns Un objeto ligero (JSON) sin funciones de Mongoose.
   */
  static async getLite(
    guildId: string,
    fields: string,
  ): Promise<Partial<IServerConfig> | null> {
    // 1. Consulta a Mongo optimizada
    const result = await ServerConfig.findOne({ guildId })
      .select(fields)
      .lean();

    // 👇 AQUÍ ESTÁ EL ARREGLO
    // Usamos 'as any' para decirle a TypeScript:
    // "Confía en mí, trata este objeto simple como si fuera la configuración completa"
    return result as any;
  }

  /**
   * Actualiza la configuración.
   * Actualiza RAM y MongoDB al mismo tiempo.
   */
  static async updateSettings(
    guildId: string,
    data: Partial<IServerConfig>,
  ): Promise<IServerConfig | null> {
    try {
      return await CacheManager.update(guildId, data);
    } catch (error) {
      console.error(
        `[ERROR] Fallo al actualizar settings de ${guildId}:`,
        error,
      );
      throw new Error("No se pudo persistir la configuración.");
    }
  }

  /**
   * Fuerza la recarga de datos
   */
  static async refresh(guildId: string): Promise<void> {
    CacheManager.flush(guildId);
    await this.getSettings(guildId);
  }
}
