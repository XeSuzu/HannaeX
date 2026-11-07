import { Document, Model, Schema, model, models } from "mongoose";

// 1. Creamos una interfaz para definir la estructura de una sugerencia.
export interface ISuggestion extends Document {
  userId: string;
  guildId: string;
  suggestion: string;
  timestamp: Date;
}

// 2. Creamos el Schema usando la interfaz.
const suggestionSchema = new Schema<ISuggestion>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  suggestion: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// 3. Creamos y exportamos el Modelo.
export const Suggestion: Model<ISuggestion> =
  (models.Suggestion as Model<ISuggestion>) ||
  model<ISuggestion>("Suggestion", suggestionSchema);

export default Suggestion;
