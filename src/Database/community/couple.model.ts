import { Document, Model, Schema, model, models } from "mongoose";

// 1. Interfaz
export interface ICouple extends Document {
  users: string[];
  kisses: number;
}

// 2. Schema
const coupleSchema = new Schema<ICouple>({
  users: { type: [String], required: true },
  kisses: { type: Number, default: 0 },
});

// 3. Índice simple para velocidad, SIN 'unique'
coupleSchema.index({ users: 1 });

// 4. Exportación
export const Couple: Model<ICouple> =
  (models.Couple as Model<ICouple>) || model<ICouple>("Couple", coupleSchema);

export default Couple;
