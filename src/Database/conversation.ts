import { Schema, model, Document, Model } from 'mongoose';

// ========================
// INTERFACES (Moldes para nuestros datos)
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
    lastInteraction: Date;
}

// ========================
// CONFIGURACIÓN
// ========================

// Número máximo de mensajes a mantener en el historial
const MAX_HISTORY_ENTRIES = 40; // 20 pares de pregunta-respuesta

// ========================
// MODELO DE LA BASE DE DATOS
// ========================

const conversationSchema = new Schema<IConversation>({
    userId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true // Índice para búsquedas rápidas
    },
    history: [
        {
            role: { type: String, required: true, enum: ['user', 'assistant'] },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    lastInteraction: { 
        type: Date, 
        default: Date.now 
    }
});

// Índice TTL para limpiar conversaciones inactivas después de 30 días
conversationSchema.index({ lastInteraction: 1 }, { expireAfterSeconds: 2592000 });

const Conversation: Model<IConversation> = model<IConversation>("Conversation", conversationSchema);

// ========================
// FUNCIONES DE BASE DE DATOS
// ========================

/**
 * Obtiene el historial de conversación de un usuario.
 * @param userId El ID del usuario.
 * @returns Una promesa que resuelve a un array con el historial.
 */
export async function getHistory(userId: string): Promise<IHistoryEntry[]> {
    try {
        const data = await Conversation.findOne({ userId });
        
        if (!data) {
            return [];
        }

        // Actualizar última interacción
        await Conversation.updateOne(
            { userId },
            { lastInteraction: new Date() }
        );

        return data.history;
    } catch (error) {
        console.error(`❌ Error al obtener historial de ${userId}:`, error);
        return [];
    }
}

/**
 * Añade una nueva entrada al historial de conversación de un usuario.
 * Mantiene automáticamente un límite de mensajes.
 * @param userId El ID del usuario.
 * @param role El rol del mensaje ('user' o 'assistant').
 * @param content El contenido del mensaje.
 */
export async function addToHistory(
    userId: string, 
    role: 'user' | 'assistant', 
    content: string
): Promise<void> {
    try {
        // Validar que el contenido no esté vacío
        if (!content || content.trim().length === 0) {
            console.warn(`⚠️ Intento de agregar mensaje vacío al historial de ${userId}`);
            return;
        }

        const updatedConversation = await Conversation.findOneAndUpdate(
            { userId },
            {
                $push: {
                    history: {
                        $each: [{ 
                            role, 
                            content: content.trim(),
                            timestamp: new Date()
                        }],
                        $slice: -MAX_HISTORY_ENTRIES // Mantiene solo los últimos N mensajes
                    }
                },
                lastInteraction: new Date()
            },
            {
                new: true,
                upsert: true
            }
        );

        console.log(`✅ Mensaje agregado al historial de ${userId} (Total: ${updatedConversation?.history.length})`);
    } catch (error) {
        console.error(`❌ Error al agregar al historial de ${userId}:`, error);
    }
}

/**
 * Limpia completamente el historial de conversación de un usuario.
 * @param userId El ID del usuario.
 * @returns True si se limpió correctamente, false si hubo un error.
 */
export async function clearHistory(userId: string): Promise<boolean> {
    try {
        const result = await Conversation.findOneAndUpdate(
            { userId },
            { 
                history: [],
                lastInteraction: new Date()
            },
            { new: true }
        );

        if (result) {
            console.log(`🧹 Historial limpiado para usuario ${userId}`);
            return true;
        } else {
            console.log(`ℹ️ No había historial para limpiar del usuario ${userId}`);
            return true;
        }
    } catch (error) {
        console.error(`❌ Error al limpiar historial de ${userId}:`, error);
        return false;
    }
}

/**
 * Elimina los mensajes más antiguos si el historial excede un límite específico.
 * @param userId El ID del usuario.
 * @param keepLast Número de mensajes recientes a mantener (default: MAX_HISTORY_ENTRIES).
 */
export async function trimHistory(userId: string, keepLast: number = MAX_HISTORY_ENTRIES): Promise<void> {
    try {
        const conversation = await Conversation.findOne({ userId });
        
        if (!conversation || conversation.history.length <= keepLast) {
            return; // No hay nada que recortar
        }

        const trimmedHistory = conversation.history.slice(-keepLast);
        
        await Conversation.updateOne(
            { userId },
            { 
                history: trimmedHistory,
                lastInteraction: new Date()
            }
        );

        console.log(`✂️ Historial recortado para ${userId}: ${conversation.history.length} → ${trimmedHistory.length}`);
    } catch (error) {
        console.error(`❌ Error al recortar historial de ${userId}:`, error);
    }
}

/**
 * Obtiene estadísticas del historial de un usuario.
 * @param userId El ID del usuario.
 */
export async function getHistoryStats(userId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
}> {
    try {
        const conversation = await Conversation.findOne({ userId });
        
        if (!conversation || conversation.history.length === 0) {
            return {
                totalMessages: 0,
                userMessages: 0,
                assistantMessages: 0,
                oldestMessage: null,
                newestMessage: null
            };
        }

        const history = conversation.history;
        
        return {
            totalMessages: history.length,
            userMessages: history.filter(m => m.role === 'user').length,
            assistantMessages: history.filter(m => m.role === 'assistant').length,
            oldestMessage: history[0].timestamp,
            newestMessage: history[history.length - 1].timestamp
        };
    } catch (error) {
        console.error(`❌ Error al obtener estadísticas de ${userId}:`, error);
        return {
            totalMessages: 0,
            userMessages: 0,
            assistantMessages: 0,
            oldestMessage: null,
            newestMessage: null
        };
    }
}

/**
 * Elimina conversaciones inactivas (sin interacción en X días).
 * @param daysInactive Número de días de inactividad para considerar una conversación como abandonada.
 */
export async function cleanupInactiveConversations(daysInactive: number = 30): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await Conversation.deleteMany({
            lastInteraction: { $lt: cutoffDate }
        });

        console.log(`🧹 Limpiadas ${result.deletedCount} conversaciones inactivas (>${daysInactive} días)`);
        return result.deletedCount;
    } catch (error) {
        console.error("❌ Error al limpiar conversaciones inactivas:", error);
        return 0;
    }
}

// ========================
// EXPORTACIONES
// ========================

export { IHistoryEntry, MAX_HISTORY_ENTRIES };