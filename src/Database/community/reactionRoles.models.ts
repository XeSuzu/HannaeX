import { Schema, model, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// REACTION CONFIG (Desafíos de reacción por mensaje específico)
// ─────────────────────────────────────────────────────────────────────────────

const reactionConfigSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  emoji: { type: String, required: true }, // El emoji a vigilar
  requiredCount: { type: Number, required: true }, // Meta de reacciones
  roleId: { type: String, required: true }, // Rol a dar
  durationMinutes: { type: Number, default: 0 }, // 0 = Permanente
});

export const ReactionConfig =
  models.ReactionConfig || model("ReactionConfig", reactionConfigSchema);

// ─────────────────────────────────────────────────────────────────────────────
// VIRAL SETUP (Reglas de popularidad por emoji a nivel de servidor)
// ─────────────────────────────────────────────────────────────────────────────

const viralSetupSchema = new Schema({
  guildId: { type: String, required: true },
  emoji: { type: String, required: true }, // Guardaremos el ID (si es custom) o el emoji (si es normal)
  requiredCount: { type: Number, required: true },
  roleId: { type: String, required: true },
  durationMinutes: { type: Number, default: 0 },
});

export const ViralSetup =
  models.ViralSetup || model("ViralSetup", viralSetupSchema);

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE ROLE (Roles temporales otorgados por reacciones)
// ─────────────────────────────────────────────────────────────────────────────

const activeRoleSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Fecha de vencimiento
});

export const ActiveRole =
  models.ActiveRole || model("ActiveRole", activeRoleSchema);
