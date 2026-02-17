import { Message } from "discord.js";
import ServerConfig from "../Models/serverConfig";

const IGNORE_WORDS = [
  "pero",
  "como",
  "donde",
  "porque",
  "cuando",
  "estos",
  "estamos",
  "bueno",
];

export async function handleCulture(message: Message) {
  if (!message.guild || message.author.bot) return;

  const content = message.content.toLowerCase();
  const words = content.split(/\s+/);

  // 1. Preparamos las llaves dinámicas para el vocabulario
  // Usamos el nombre del campo en la DB para actualizar sin cargar el documento
  const updates: any = {};
  for (const word of words) {
    if (
      word.startsWith("http") ||
      word.includes(".") ||
      word.length < 5 ||
      IGNORE_WORDS.includes(word)
    )
      continue;

    // Esto le dice a MongoDB: "Súmale 1 a este campo específico"
    updates[`culture.vocabulary.${word}`] = 1;
  }

  // Sumamos confianza al usuario también
  updates[`socialMap.trustLevels.${message.author.id}`] = 0.1;

  try {
    // 2. ACTUALIZACIÓN DIRECTA (Aquí está el truco)
    // Usamos findOneAndUpdate con el operador $inc y $push
    await ServerConfig.collection.updateOne(
      { guildId: message.guildId, aiMode: "libre" },
      {
        $inc: updates,
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
    // Ignoramos errores de colisión menores para no detener el bot
    console.error("⚠️ Error menor en aprendizaje (ignorable):", err);
  }
}
