import { Schema, model, models, Document, Model } from "mongoose";

// ========================
// INTERFACES 🌸
// ========================

export interface IHistoryEntry {
  role: string;
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: string;
  history: IHistoryEntry[];
  lastInteraction: Date;
}

// ========================
// CONFIGURACIÓN ⚙️
// ========================

export const MAX_HISTORY_ENTRIES = 40;

// ========================
// MODELO DE LA BASE DE DATOS 🗃️
// ========================

const conversationSchema = new Schema<IConversation>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  history: [
    {
      role: { type: String, required: true, enum: ["user", "assistant"] },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  lastInteraction: {
    type: Date,
    default: Date.now,
  },
});

// Índice TTL: Borra automáticamente tras 30 días de inactividad para ahorrar espacio 🍃
conversationSchema.index(
  { lastInteraction: 1 },
  { expireAfterSeconds: 2592000 },
);

// Exportación segura para evitar errores de recompilación en desarrollo ✨
const Conversation: Model<IConversation> =
  models.Conversation ||
  model<IConversation>("Conversation", conversationSchema);

// ========================
// FUNCIONES DE BASE DE DATOS 🚀
// ========================

/**
 * Obtiene el historial de un usuario y actualiza su última interacción en un solo paso.
 */
export async function getHistory(userId: string): Promise<IHistoryEntry[]> {
  try {
    // Usamos findOneAndUpdate para obtener los datos y actualizar la fecha de una vez ⚡
    const data = await Conversation.findOneAndUpdate(
      { userId },
      { lastInteraction: new Date() },
      { new: true },
    );

    return data ? data.history : [];
  } catch (error) {
    console.error(`❌ Error al obtener historial de ${userId}:`, error);
    return [];
  }
}

/**
 * Añade una entrada al historial y mantiene el límite de mensajes.
 */
export async function addToHistory(
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  try {
    if (!content || content.trim().length === 0) return;

    const updatedConversation = await Conversation.findOneAndUpdate(
      { userId },
      {
        $push: {
          history: {
            $each: [
              {
                role,
                content: content.trim(),
                timestamp: new Date(),
              },
            ],
            $slice: -MAX_HISTORY_ENTRIES, // Mantiene solo los mensajes más recientes
          },
        },
        lastInteraction: new Date(),
      },
      {
        new: true,
        upsert: true, // Crea el documento si el usuario es nuevo ✨
      },
    );

    console.log(
      `✅ Historial actualizado para ${userId} (Total: ${updatedConversation?.history.length})`,
    );
  } catch (error) {
    console.error(`❌ Error al agregar al historial de ${userId}:`, error);
  }
}

/**
 * Limpia el historial del usuario eliminando el documento completo.
 */
export async function clearHistory(userId: string): Promise<boolean> {
  try {
    // Es más limpio y eficiente borrar el documento que vaciar el array 🧹
    const result = await Conversation.deleteOne({ userId });

    if (result.deletedCount > 0) {
      console.log(`🧹 Historial eliminado para usuario ${userId}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error al limpiar historial de ${userId}:`, error);
    return false;
  }
}

/**
 * Obtiene estadísticas rápidas de la charla 📊
 */
export async function getHistoryStats(userId: string) {
  try {
    const conversation = await Conversation.findOne({ userId });

    if (!conversation || conversation.history.length === 0) {
      return { totalMessages: 0, userMessages: 0, assistantMessages: 0 };
    }

    const history = conversation.history;
    return {
      totalMessages: history.length,
      userMessages: history.filter((m) => m.role === "user").length,
      assistantMessages: history.filter((m) => m.role === "assistant").length,
      oldestMessage: history[0].timestamp,
      newestMessage: history[history.length - 1].timestamp,
    };
  } catch (error) {
    console.error(`❌ Error en estadísticas de ${userId}:`, error);
    return null;
  }
}

export default Conversation;
