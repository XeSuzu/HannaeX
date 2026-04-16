import { Document, Schema, model } from "mongoose";

export interface IActiveVoiceSession extends Document {
  userId: string;
  guildId: string;
  channelId: string;
  start: Date;
  token: string;
}

const activeVoiceSessionSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  start: { type: Date, required: true },
  token: { type: String, required: true },
});

// Una sesión por usuario por guild
activeVoiceSessionSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// TTL automático: limpia sesiones huérfanas después de 24h
activeVoiceSessionSchema.index(
  { start: 1 },
  { expireAfterSeconds: 60 * 60 * 24 },
);

export default model<IActiveVoiceSession>(
  "ActiveVoiceSession",
  activeVoiceSessionSchema,
);
