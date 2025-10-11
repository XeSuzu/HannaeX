import { EmbedBuilder, Message, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import { HoshikoClient } from '../../../index'; // Ajusta la ruta a tu index.ts principal

interface PrefixCommand {
    name: string;
    description: string;
    execute: (message: Message, args: string[], client: HoshikoClient) => Promise<void>;
}

const command: PrefixCommand = {
    name: 'ping',
    description: 'Muestra la latencia del bot 🏓',

    async execute(message, args, client) {
        // ✅ Solo ejecutamos si el canal existe y puede enviar mensajes
        if (!message.channel || !message.channel.isTextBased()) return;

        // 🔒 Aseguramos el tipo del canal
        const channel = message.channel as TextChannel | DMChannel | NewsChannel;

        let sentMessage: Message;
        try {
            sentMessage = await channel.send('🏓 Calculando...');
        } catch {
            return;
        }

        const latency = sentMessage.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(0xffc0cb)
            .addFields(
                { name: '📡 Latencia Bot', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 Latencia API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: 'Nyaa~ Estoy lista' })
            .setTimestamp();

        try {
            await sentMessage.edit({ content: '', embeds: [embed] });
        } catch {
            // Si no se puede editar (por permisos o error), no hacemos nada.
        }
    }
};

export = command;
