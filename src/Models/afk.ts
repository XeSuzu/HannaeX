import { Schema, model, models, Document } from 'mongoose';

// 1. Creamos una "interfaz" que define la estructura de un documento AFK.
//    Esto le enseña a TypeScript cómo son tus datos.
export interface IAfk extends Document {
  userId: string;
  guildId: string;
  reason: string;
  timestamp: Date;
}

// 2. Creamos el Schema usando la interfaz para asegurar que todo coincida.
const afkSchema = new Schema<IAfk>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  reason: { type: String, default: "AFK 🐾" },
  timestamp: { type: Date, default: Date.now },
});

// El índice se mantiene igual, es una configuración de la base de datos.
afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// 3. Exportamos el modelo usando la sintaxis de TypeScript.
//    Esta lógica previene que Mongoose compile el mismo modelo varias veces.
export default models.AFK || model<IAfk>("AFK", afkSchema);