import ServerConfig from "../Models/serverConfig";

export class PremiumManager {
  /**
   * 🕵️‍♀️ Verifica si un servidor es Premium
   * Retorna true si tiene una fecha de vencimiento futura.
   */
  static async isPremium(guildId: string): Promise<boolean> {
    try {
      const config = await ServerConfig.findOne({ guildId }).lean();
      if (!config || !config.premiumUntil) return false;

      const now = new Date();
      // Es premium si la fecha de vencimiento es MAYOR a ahora
      return new Date(config.premiumUntil) > now;
    } catch (error) {
      console.error(`[PREMIUM-CHECK] Error en ${guildId}:`, error);
      return false;
    }
  }

  /**
   * 📅 Obtiene la fecha de vencimiento (para mostrarla en mensajes)
   */
  static async getExpiryDate(guildId: string): Promise<Date | null> {
    const config = await ServerConfig.findOne({ guildId }).lean();
    if (!config || !config.premiumUntil) return null;
    return config.premiumUntil;
  }
}
