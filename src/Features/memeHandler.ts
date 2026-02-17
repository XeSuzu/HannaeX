import { Message } from "discord.js";
import ServerConfig from "../Models/serverConfig";
import Meme from "../Database/meme";

export default async (message: Message): Promise<boolean> => {
  const config = await ServerConfig.findOne({ guildId: message.guild!.id });

  if (!config || message.channel.id !== config.memeChannelId) {
    return false;
  }

  if (message.attachments.size > 0) {
    try {
      await message.react("👍");
      await message.react("👎");

      const memeExistente = await Meme.findOne({
        messageId: message.id,
        guildId: message.guild!.id,
      });
      if (!memeExistente) {
        const nuevoMeme = new Meme({
          messageId: message.id,
          authorId: message.author.id,
          guildId: message.guild!.id,
          channelId: message.channel.id,
          points: 0,
          memeUrl: message.attachments.first()!.url,
        });
        await nuevoMeme.save();
      }
    } catch (error) {
      console.error("Error al reaccionar al meme:", error);
    }
  }

  return true; // El mensaje fue en el canal de memes, lo consideramos manejado.
};
