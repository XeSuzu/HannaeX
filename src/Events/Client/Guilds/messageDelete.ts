import { Events, Message, Collection } from 'discord.js';

// Definimos la estructura de datos
export interface SnipeData {
    content: string;
    author: string;
    authorAvatar: string;
    image: string | null;
    timestamp: number;
}

// Mapa global de Snipes
export const snipes = new Collection<string, SnipeData[]>();

export default {
    name: Events.MessageDelete,
    execute(message: Message) {
        // 🛡️ PROTECCIÓN CRÍTICA (ESTO ARREGLA TU ERROR)
        // Si el mensaje es muy viejo, Discord no nos da los datos del autor (es null).
        // Si no hay autor, cancelamos para no tumbar el bot.
        if (!message.author) return; 

        // Ignoramos bots y mensajes privados
        if (message.author.bot || !message.guild) return;

        // Obtenemos la lista actual de este canal
        const currentSnipes = snipes.get(message.channel.id) || [];

        // Creamos el nuevo registro
        const newSnipe: SnipeData = {
            content: message.content || "*(Solo imagen/sticker)*",
            author: message.author.tag,
            authorAvatar: message.author.displayAvatarURL(), 
            image: message.attachments.first()?.proxyURL || null,
            timestamp: Date.now()
        };

        // Ponemos el nuevo al PRINCIPIO de la lista
        currentSnipes.unshift(newSnipe);

        // Limpieza de memoria (máximo 10)
        if (currentSnipes.length > 10) {
            currentSnipes.pop();
        }

        // Guardamos
        snipes.set(message.channel.id, currentSnipes);
    }
};