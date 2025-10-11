import { MessageReaction, User, PartialUser, Events } from 'discord.js';
import Meme from '../../Database/meme';
import ServerConfig from '../../Models/serverConfig';

export = {
    // Usamos el enum 'Events' para mayor seguridad y claridad
    name: Events.MessageReactionRemove,

    async execute(reaction: MessageReaction, user: User | PartialUser) {
        // 1. Manejo de "parciales" para asegurar que tenemos toda la información
        // Si el usuario es parcial (no está en caché), lo cargamos
        if (user.partial) {
            try {
                await user.fetch();
            } catch (error) {
                console.error('No se pudo buscar al usuario que quitó la reacción:', error);
                return;
            }
        }
        
        // Ahora que estamos seguros de que 'user' es un objeto completo, podemos verificar si es un bot
        if (user.bot) return;

        // Si la reacción es parcial, la cargamos
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('No se pudo buscar la reacción:', error);
                return;
            }
        }

        // 2. La lógica principal se mantiene, ahora con la seguridad de tener todos los datos
        const guildId = reaction.message.guild?.id;
        if (!guildId) return; // Salimos si no estamos en un servidor

        const config = await ServerConfig.findOne({ guildId: guildId });
        if (!config || reaction.message.channel.id !== config.memeChannelId) {
            return;
        }

        // Definimos el tipo del objeto para mayor claridad y seguridad
        const emojisConPuntos: { [key: string]: number } = {
            '👍': 1,
            '👎': -1
        };

        const emojiName = reaction.emoji.name;
        if (!emojiName || !emojisConPuntos[emojiName]) return;

        const pointsToRevert = emojisConPuntos[emojiName];

        try {
            const updatedMeme = await Meme.findOneAndUpdate(
                { messageId: reaction.message.id, guildId: guildId },
                // Restamos los puntos que se revirtieron (restando un negativo suma)
                { $inc: { points: -pointsToRevert } },
                { new: true }
            );
            
            // Lógica para evitar puntos negativos (se mantiene)
            if (updatedMeme && updatedMeme.points < 0) {
              updatedMeme.points = 0;
              await updatedMeme.save();
            }

            console.log(`Puntos revertidos para el meme ${reaction.message.id}. Total: ${updatedMeme ? updatedMeme.points : 0}`);
        } catch (error: any) {
            console.error('Error al revertir los puntos del meme:', error.message);
        }
    },
};