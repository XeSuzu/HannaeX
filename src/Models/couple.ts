import { Schema, model, models, Document } from 'mongoose';

// 1. Interfaz que define la estructura de una "pareja" en la base de datos.
export interface ICouple extends Document {
  users: string[]; // Un array con los dos IDs de usuario
  kisses: number;  // El contador de besos
}

// 2. Schema de Mongoose usando la interfaz.
const coupleSchema = new Schema<ICouple>({
  users: { type: [String], required: true },
  kisses: { type: Number, default: 0 },
});

// 3. Índice único para asegurar que no haya parejas duplicadas (ej: [A, B] es lo mismo que [B, A]).
coupleSchema.index({ users: 1 }, { unique: true });

// 4. Exportación segura del modelo.
export default models.Couple || model<ICouple>("Couple", coupleSchema);