import { Document, Model, Schema, model, models } from "mongoose";

/**
 * Interfaz que define los datos puros del AFK ✨
 */
export interface IAfk extends Document {
  userId: string;
  guildId: string;
  reason: string;
  originalNickname?: string; // ¡Añadimos esto para el cambio de nombre! 🏷️
  timestamp: Date;
}

/**
 * Esquema de Mongoose para la base de datos 🗃️
 */
const afkSchema = new Schema<IAfk>({
  userId: {
    type: String,
    required: [true, "El ID de usuario es obligatorio"],
  },
  guildId: {
    type: String,
    required: [true, "El ID del servidor es obligatorio"],
  },
  reason: {
    type: String,
    default: "AFK 🐾",
    maxlength: [100, "La razón es muy larga, nya~"],
  },
  originalNickname: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Índice único: Un usuario solo puede tener un estado AFK por servidor 🏠
afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const AFK: Model<IAfk> =
  (models.AFK as Model<IAfk>) || model<IAfk>("AFK", afkSchema);

export default AFK;
