import { Document, Schema, model } from "mongoose";

export interface ILocalLevel extends Document {
  userId: string;
  guildId: string;

  // -- PROGRESO TEXTO --
  xp: number;
  level: number;
  messagesSent: number;
  lastXpGain: Date;

  // -- PROGRESO VOZ --
  voiceXp: number;
  voiceLevel: number;
  voiceMinutes: number; // Tiempo real total en VC; el cap solo aplica al XP

  // -- SEMANAL LOCAL --
  weeklyXp: number;
  weeklyMessages: number;
  weeklyVoiceMinutes: number;
  weekStartDate: Date;

  // -- ANTI ABUSO --
  abuseCooldownUntil?: Date;
  lastAbuseWarning?: Date;
}

const localLevelSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  lastXpGain: { type: Date, default: Date.now },

  voiceXp: { type: Number, default: 0 },
  voiceLevel: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },

  weeklyXp: { type: Number, default: 0 },
  weeklyMessages: { type: Number, default: 0 },
  weeklyVoiceMinutes: { type: Number, default: 0 },
  weekStartDate: { type: Date, default: new Date(0) },

  abuseCooldownUntil: { type: Date },
  lastAbuseWarning: { type: Date },
});

// Unique por usuario+servidor
localLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Leaderboard local permanente
localLevelSchema.index({ guildId: 1, level: -1, xp: -1 });

// Leaderboard semanal local
localLevelSchema.index({
  guildId: 1,
  weeklyXp: -1,
  weeklyMessages: -1,
  xp: -1,
});

// VC leaderboard local
localLevelSchema.index({ guildId: 1, voiceXp: -1 });

export default model<ILocalLevel>("LocalLevel", localLevelSchema);
