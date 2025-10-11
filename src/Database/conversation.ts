import { Schema, model, Document, Model } from 'mongoose';

// ========================
//  INTERFACES (Moldes para nuestros datos)
// ========================

// 1. Interfaz para una entrada individual en el historial.
interface IHistoryEntry {
  role: string;
  content: string;
  timestamp: Date;
}

// 2. Interfaz para el documento completo de la conversación.
export interface IConversation extends Document {
  userId: string;
  history: IHistoryEntry[];
}

// ========================
//  MODELO DE LA BASE DE DATOS
// ========================

const conversationSchema = new Schema<IConversation>({
  userId: { type: String, required: true, unique: true },
  history: [
    {
      role: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

// Usamos Model<IConversation> para que TypeScript sepa qué tipo de modelo es.
const Conversation: Model<IConversation> = model<IConversation>("Conversation", conversationSchema);

// ========================
//  FUNCIONES DE BASE DE DATOS
// ========================

/**
 * Obtiene el historial de conversación de un usuario.
 * @param userId El ID del usuario.
 * @returns Una promesa que resuelve a un array con el historial.
 */
export async function getHistory(userId: string): Promise<IHistoryEntry[]> {
  const data = await Conversation.findOne({ userId });
  return data ? data.history : [];
}

/**
 * Añade una nueva entrada al historial de conversación de un usuario.
 * @param userId El ID del usuario.
 * @param role El rol del mensaje ('user' o 'assistant').
 * @param content El contenido del mensaje.
 */
export async function addToHistory(userId: string, role: string, content: string): Promise<void> {
  // findOneAndUpdate con upsert es más eficiente que buscar y luego guardar.
  const updatedConversation = await Conversation.findOneAndUpdate(
    { userId },
    { 
      // Añadimos la nueva entrada al final del array 'history'.
      $push: { 
        history: {
          $each: [{ role, content }], // Usamos $each para añadir el objeto
          $slice: -5 // Mantenemos solo los últimos 5 elementos del array
        }
      }
    },
    { 
      new: true, // Devuelve el documento actualizado
      upsert: true // Crea el documento si no existe
    }
  );
}