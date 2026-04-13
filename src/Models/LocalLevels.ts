import { Document, Schema, model } from "mongoose";

export interface ILocalLevel extends Document {
  userId: string;
  guildId: string;

  //--PROGRESO--

  xp: number;
  level: number;
  messagesSent: number;
  lastXpGain: Date;

  // XP de voz
  voiceXp: number;
  voiceLevel: number;
  voiceMinutes: number;

  // Anti Abuso
  abuseCooldownUntil?: Date; // Cooldown por abuso general
  lastAbuseWarning?: Date; // Última advertencia por abuso
}

const localLevelSchema = new Schema<ILocalLevel>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  lastXpGain: { type: Date, default: Date.now },

  // Voz
  voiceXp: { type: Number, default: 0 },
  voiceLevel: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },

  // Anti Abuso
  abuseCooldownUntil: { type: Date },
  lastAbuseWarning: { type: Date },
});

localLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });
localLevelSchema.index({ guildId: 1, xp: -1 });
localLevelSchema.index({ guildId: 1, voiceXp: -1 });

export default model<ILocalLevel>("LocalLevel", localLevelSchema);
