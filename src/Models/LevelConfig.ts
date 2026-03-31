import { Document, Schema, model } from "mongoose";

export interface ILevelRole {
  level: number;
  roleId: string;
  message?: string | null; // Mensaje personalizado al obtener el rol
}

export interface ILevelConfig extends Document {
  guildId: string;

  // Estado general
  enabled: boolean;

  // Canales de anuncio
  announceChannelId: string | null;
  announceDM: boolean;
  announceMode: "all" | "milestone" | "silent"; // all=siempre, milestone=solo niveles importantes, silent=no anunciar

  // XP por mensajes
  xpPerMessage: number;
  xpCooldown: number; // segundos entre ganancias de XP
  xpMinLength: number; // mínimo de caracteres para ganar XP (evitar spam)
  xpMultiplier: number; // multiplicador global (para eventos o premium)

  // XP por voz
  xpVoiceEnabled: boolean;
  xpPerMinuteVoice: number;
  xpVoiceMinMinutes: number; // minutos mínimos en voz para contar

  // XP por menciones (bonus)
  xpMentionBonus: number; // XP extra por mencionar a otros
  xpMentionMaxBonus: number; // máximo de bonus por menciones

  // XP por reacciones
  xpReactionEnabled: boolean;
  xpPerReaction: number;

  // Ignorados
  ignoredChannels: string[];
  ignoredRoles: string[];
  ignoreBots: boolean; // si ignorar mensajes de bots

  // Roles por nivel
  levelRoles: ILevelRole[];

  // Penalización por inactividad (opcional)
  inactivityPenaltyEnabled: boolean;
  inactivityPenaltyDays: number;
  inactivityPenaltyPercent: number; // % de XP a perder por semana de inactividad

  // Modo premium del servidor
  isPremium: boolean;
}

const levelConfigSchema = new Schema<ILevelConfig>({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  announceChannelId: { type: String, default: null },
  announceDM: { type: Boolean, default: false },
  announceMode: {
    type: String,
    enum: ["all", "milestone", "silent"],
    default: "all",
  },

  // XP mensajes
  xpPerMessage: { type: Number, default: 20 },
  xpCooldown: { type: Number, default: 60 },
  xpMinLength: { type: Number, default: 5 }, // mínimo 5 caracteres
  xpMultiplier: { type: Number, default: 1.0 },

  // XP voz
  xpVoiceEnabled: { type: Boolean, default: true },
  xpPerMinuteVoice: { type: Number, default: 10 },
  xpVoiceMinMinutes: { type: Number, default: 1 },

  // XP menciones
  xpMentionBonus: { type: Number, default: 5 },
  xpMentionMaxBonus: { type: Number, default: 25 },

  // XP reacciones
  xpReactionEnabled: { type: Boolean, default: false },
  xpPerReaction: { type: Number, default: 2 },

  // Ignorados
  ignoredChannels: { type: [String], default: [] },
  ignoredRoles: { type: [String], default: [] },
  ignoreBots: { type: Boolean, default: true },

  // Roles
  levelRoles: [
    {
      level: { type: Number, required: true },
      roleId: { type: String, required: true },
      message: { type: String, default: null },
    },
  ],

  // Inactividad
  inactivityPenaltyEnabled: { type: Boolean, default: false },
  inactivityPenaltyDays: { type: Number, default: 7 },
  inactivityPenaltyPercent: { type: Number, default: 5 },

  isPremium: { type: Boolean, default: false },
});

export default model<ILevelConfig>("LevelConfig", levelConfigSchema);
