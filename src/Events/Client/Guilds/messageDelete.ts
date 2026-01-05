import { Events, Message, Collection } from 'discord.js';
import { HoshikoClient } from '../../../index';

// Creamos un mapa global para guardar los mensajes borrados por canal 🐈
export const snipes = new Collection<string, { content: string, author: string, image: string | null, timestamp: number }>();

export default {
    name: Events.MessageDelete,
    execute(message: Message) {
        if (message.author?.bot || !message.guild) return;

        // Guardamos los datos del mensaje borrado
        snipes.set(message.channel.id, {
            content: message.content || "*(Mensaje sin texto)*",
            author: message.author.tag,
            image: message.attachments.first()?.proxyURL || null,
            timestamp: Date.now()
        });
    }
};