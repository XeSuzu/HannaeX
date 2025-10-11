import { Schema, model, Document } from 'mongoose';

// 1. Creamos una "interfaz". Es un contrato que define cómo se ve un documento de meme.
export interface IMeme extends Document {
  messageId: string;
  authorId: string;
  points: number;
  guildId: string;
  memeUrl: string;
}

// 2. Creamos el Schema, usando la interfaz para asegurar que coincidan.
const memeSchema = new Schema<IMeme>({
  messageId: { type: String, required: true, unique: true },
  authorId: { type: String, required: true },
  points: { type: Number, default: 0 },
  guildId: { type: String, required: true },
  memeUrl: { type: String, required: true },
});

// 3. Creamos y exportamos el Modelo, que también usará la interfaz.
export default model<IMeme>('Meme', memeSchema);