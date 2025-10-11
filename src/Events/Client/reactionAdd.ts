import { MessageReaction, User, PartialUser, Events } from 'discord.js';
import Meme from '../../Database/meme'; // Ajusta la ruta a tu modelo
import ServerConfig from '../../Models/serverConfig'; // Ajusta la ruta a tu modelo

export = {
    name: Events.MessageReactionAdd,

    async execute(reaction: MessageReaction, user: User | PartialUser) {
        // Primero, nos aseguramos de tener la información completa del usuario y la reacción.
        if (user.partial) {
            try {
                await user.fetch();
            } catch (error) {
                console.error('No se pudo buscar al usuario que reaccionó:', error);
                return;
            }
        }
        
        // Ahora podemos verificar si es un bot.
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('No se pudo buscar la reacción:', error);
                return;
            }
        }

        // Añadimos una comprobación de seguridad para el servidor.
        const guildId = reaction.message.guild?.id;
        if (!guildId) return;

        const config = await ServerConfig.findOne({ guildId: guildId });

        if (!config || reaction.message.channel.id !== config.memeChannelId) {
            return;
        }

        // Definimos el tipo del objeto para mayor claridad.
        const emojisConPuntos: { [key: string]: number } = {
            '👍': 1,
            '👎': -1
        };
        
        const emojiName = reaction.emoji.name;

        // Si el emoji no es uno de los que nos interesa, salimos.
        if (!emojiName || !emojisConPuntos[emojiName]) return;

        const pointsToAdd = emojisConPuntos[emojiName];
        const message = reaction.message;

        try {
            const updatedMeme = await Meme.findOneAndUpdate(
                { messageId: message.id, guildId: guildId },
                {
                    $inc: { points: pointsToAdd },
                    // $setOnInsert solo se ejecuta si el documento es nuevo.
                    $setOnInsert: {
                        // Usamos ?. para asegurarnos de que el autor y la URL existan.
                        authorId: message.author?.id,
                        memeUrl: message.attachments.first()?.url,
                        channelId: message.channel.id
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (updatedMeme) {
              console.log(`Puntos actualizados para el meme ${message.id}. Total: ${updatedMeme.points}`);
            }
        } catch (error: any) {
            console.error('Error al actualizar los puntos del meme:', error.message);
        }
    },
};