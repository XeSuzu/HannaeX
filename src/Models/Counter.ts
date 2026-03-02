// src/Models/Counter.ts
import { Schema, model, Document } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

// No extiende Document — usamos el segundo genérico de model<> para el tipo raw
const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0     },
  },
  { collection: "counters" }
);

export const Counter = model<ICounter>("Counter", CounterSchema);
