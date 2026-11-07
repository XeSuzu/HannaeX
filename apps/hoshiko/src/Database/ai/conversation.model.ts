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
  guildId: string;
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
    index: true,
  },
  guildId: {
    type: String,
    required: true,
    default: "dm",
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

// Aislamiento por usuario y servidor (o 'dm' para mensajes directos)
conversationSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Índice TTL: Borra automáticamente tras 30 días de inactividad para ahorrar espacio 🍃
conversationSchema.index(
  { lastInteraction: 1 },
  { expireAfterSeconds: 2592000 },
);

// Exportación segura para evitar errores de recompilación en desarrollo ✨
export const Conversation: Model<IConversation> =
  models.Conversation ||
  model<IConversation>("Conversation", conversationSchema);

// ========================
// FUNCIONES DE BASE DE DATOS 🚀
// ========================

/**
 * Obtiene el historial de un usuario en un servidor específico (o DM) y actualiza su última interacción en un solo paso.
 */
export async function getHistory(
  userId: string,
  guildId: string = "dm",
): Promise<IHistoryEntry[]> {
  try {
    // Usamos findOneAndUpdate para obtener los datos y actualizar la fecha de una vez ⚡
    const data = await Conversation.findOneAndUpdate(
      { userId, guildId: guildId || "dm" },
      { lastInteraction: new Date() },
      { new: true },
    );

    return data ? data.history : [];
  } catch (error) {
    console.error(`❌ Error al obtener historial de ${userId} (guild: ${guildId}):`, error);
    return [];
  }
}

/**
 * Añade una entrada al historial aislado por usuario y servidor, manteniendo el límite de mensajes.
 */
export async function addToHistory(
  userId: string,
  role: "user" | "assistant",
  content: string,
  guildId: string = "dm",
): Promise<void> {
  try {
    if (!content || content.trim().length === 0) return;

    const targetGuild = guildId || "dm";
    const updatedConversation = await Conversation.findOneAndUpdate(
      { userId, guildId: targetGuild },
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
      `✅ Historial actualizado para ${userId} [${targetGuild}] (Total: ${updatedConversation?.history.length})`,
    );
  } catch (error) {
    console.error(`❌ Error al agregar al historial de ${userId} (guild: ${guildId}):`, error);
  }
}

/**
 * Limpia el historial del usuario para un servidor específico (o DM).
 */
export async function clearHistory(
  userId: string,
  guildId: string = "dm",
): Promise<boolean> {
  try {
    const result = await Conversation.deleteOne({
      userId,
      guildId: guildId || "dm",
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Historial eliminado para usuario ${userId} [${guildId || "dm"}]`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error al limpiar historial de ${userId} (guild: ${guildId}):`, error);
    return false;
  }
}

/**
 * Obtiene estadísticas rápidas de la charla aisladas por servidor 📊
 */
export async function getHistoryStats(userId: string, guildId: string = "dm") {
  try {
    const conversation = await Conversation.findOne({
      userId,
      guildId: guildId || "dm",
    });

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
    console.error(`❌ Error en estadísticas de ${userId} (guild: ${guildId}):`, error);
    return null;
  }
}

export default Conversation;
