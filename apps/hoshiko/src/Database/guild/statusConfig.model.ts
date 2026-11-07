import { Schema, model, models } from "mongoose";

const StatusConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  targetRoleId: { type: String, required: true },
  requiredText: { type: String, required: true }, // Ej: ".gg/hoshiko"
  enabled: { type: Boolean, default: true },
});

export const StatusConfig =
  models.StatusConfig || model("StatusConfig", StatusConfigSchema);

export default StatusConfig;
