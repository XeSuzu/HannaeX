import { Schema, model, models, Document } from 'mongoose';

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

// 3. ❌ ELIMINAMOS O CAMBIAMOS EL ÍNDICE
// Opción A: Borrar esta línea totalmente (Recomendado para comandos de besos casuales).
// La lógica de `findOneAndUpdate` en tu comando kiss.ts ya se encarga de no crear duplicados para la misma pareja.

// Opción B (Opcional): Índice simple para velocidad, PERO SIN 'unique'
coupleSchema.index({ users: 1 }); 

// 4. Exportación
export default models.Couple || model<ICouple>("Couple", coupleSchema);