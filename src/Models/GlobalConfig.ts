import { Document, Schema, model } from "mongoose";

// ============================================
// CONFIGURACIÓN GLOBAL DEL SISTEMA DE NIVELES
// ============================================
// Configuración que aplica a TODOS los servidores.
// Los servidores pueden tener su propia config local pero
// la config global afecta el sistema global.

export interface IGlobalConfig extends Document {
  // Estado global del sistema
  globalEnabled: boolean;

  // XP global por actividad
  globalXpPerMessage: number; // XP global por mensaje
  globalXpCooldown: number; // Cooldown global en segundos

  // Multiplicadores por tier de servidor
  premiumMultiplier: number; // Multiplicador para servidores premium
  defaultMultiplier: number; // Multiplicador para servidores default

  // Configuración de logros
  achievementsEnabled: boolean;

  // Configuración de racha global
  globalStreakEnabled: boolean;
  streakResetHours: number; // Horas sin actividad para resetear racha

  // Configuración de recompensas semanales
  weeklyRewardsEnabled: boolean;

  // Canales de anuncio global (opcional)
  globalAnnounceChannel: string | null;
  globalAnnounceEnabled: boolean;

  // Rate limits
  maxXpPerMessage: number;
  maxXpPerDay: number;

  // Top global settings
  showInGlobalTop: boolean; // Si el usuario aparece en el ranking global

  // Actualizado
  updatedAt: Date;
}

const globalConfigSchema = new Schema<IGlobalConfig>({
  globalEnabled: { type: Boolean, default: true }, // Siempre activo por defecto
  globalXpPerMessage: { type: Number, default: 5 }, // Menos XP que la local
  globalXpCooldown: { type: Number, default: 30 }, // 30 segundos
  premiumMultiplier: { type: Number, default: 2.0 },
  defaultMultiplier: { type: Number, default: 1.0 },
  achievementsEnabled: { type: Boolean, default: true },
  globalStreakEnabled: { type: Boolean, default: true },
  streakResetHours: { type: Number, default: 24 },
  weeklyRewardsEnabled: { type: Boolean, default: true },
  globalAnnounceChannel: { type: String, default: null },
  globalAnnounceEnabled: { type: Boolean, default: false },
  maxXpPerMessage: { type: Number, default: 20 },
  maxXpPerDay: { type: Number, default: 500 },
  showInGlobalTop: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now },
});

// Crear modelo con nombre explícito
const GlobalConfigModel = model<IGlobalConfig>(
  "GlobalConfig",
  globalConfigSchema,
);

// Singleton para obtener la config
let cachedConfig: IGlobalConfig | null = null;

export async function getGlobalConfig(): Promise<IGlobalConfig> {
  if (cachedConfig) return cachedConfig;

  const doc = await GlobalConfigModel.findOne({}).exec();
  if (!doc) {
    cachedConfig = await GlobalConfigModel.create({});
  } else {
    cachedConfig = doc;
  }
  return cachedConfig;
}

export function clearGlobalConfigCache(): void {
  cachedConfig = null;
}

export default GlobalConfigModel;
