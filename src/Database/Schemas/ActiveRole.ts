import { Schema, model } from "mongoose";

const activeRoleSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Fecha de vencimiento
});

export default model("ActiveRole", activeRoleSchema);
