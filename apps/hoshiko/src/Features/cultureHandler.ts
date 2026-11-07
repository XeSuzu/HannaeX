import { Message } from "discord.js";
import ServerConfig from "../Database/guild/serverConfig.model";

/**
 * Manejador de memoria a corto plazo para contexto comunitario en servidores libres.
 * Mantiene únicamente los últimos 20 mensajes con $slice acotado, sin $inc dinámicos
 * ni invalidación de CacheManager.
 */
export async function handleCulture(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const content = message.content?.trim();
  if (!content || content.length < 3 || content.startsWith("/") || content.startsWith("!")) {
    return;
  }

  try {
    await ServerConfig.collection.updateOne(
      { guildId: message.guildId, aiMode: "libre" },
      {
        $push: {
          shortTermMemory: {
            $each: [
              {
                content: message.content,
                timestamp: new Date(),
                participants: [message.author.id],
              },
            ],
            $slice: -20, // Mantiene solo los últimos 20
          },
        } as any,
      },
    );
  } catch (err) {
    // Ignorar errores no críticos para no detener el flujo del bot
  }
}
