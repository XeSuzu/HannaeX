import { Events, Message } from 'discord.js';
import { HoshikoClient } from '../../index';
import handleAfk from '../../Features/afkHandler';
import handleMemes from '../../Features/memeHandler';
import handleAi from '../../Features/aiHandler';

export = {
    name: Events.MessageCreate,
    async execute(message: Message, client: HoshikoClient) {
        if (message.author.bot || !message.guild) return;

        try {
            // 1. Manejador de Comandos de Prefijo
            const prefix = client.config.prefix;
            if (prefix && message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/g);
                const commandName = args.shift()!.toLowerCase();
                const command = client.commands.get(commandName);
                if (command) {
                    await command.execute(message, args, client);
                }
                return;
            }

            // 2. Cadena de Responsabilidad: si un handler maneja el mensaje, nos detenemos.
            if (await handleAfk(message)) return;
            if (await handleMemes(message)) return;
            if (await handleAi(message, client)) return;

        } catch (err: any) {
            console.error("💥 Error en messageCreate:", err.message);
        }
    },
};