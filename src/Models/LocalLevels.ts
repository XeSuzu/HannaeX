import { Schema, model, Document } from "mongoose";

export interface ILocalLevel extends Document {
  userId: string;
  guildId: string;

  //--PROGRESO--

  xp: number;
  level: number;

  //--ESTADISTICAS--
  // HOOKS FUTUROS INTEGRACION CON ECONOMIA
  messagesSent: number;

  lastXpGain: Date;
}

const localLevelSchema = new Schema<ILocalLevel>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },

  messagesSent: { type: Number, default: 0 },

  lastXpGain: { type: Date, default: Date.now },
});

localLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });
localLevelSchema.index({ guildId: 1, xp: -1 });

export default model<ILocalLevel>("LocalLevel", localLevelSchema);
