import { Schema, model } from "mongoose";

const reactionConfigSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  emoji: { type: String, required: true }, // El emoji a vigilar
  requiredCount: { type: Number, required: true }, // Meta de reacciones
  roleId: { type: String, required: true }, // Rol a dar
  durationMinutes: { type: Number, default: 0 }, // 0 = Permanente
});

export default model("ReactionConfig", reactionConfigSchema);
