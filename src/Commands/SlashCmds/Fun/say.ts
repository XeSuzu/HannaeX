import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    InteractionResponse,
    TextChannel,
    NewsChannel,
    ThreadChannel
} from 'discord.js';
import { HoshikoClient } from '../../../index';

interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (
        interaction: ChatInputCommandInteraction,
        client: HoshikoClient
    ) => Promise<void | Message | InteractionResponse>;
}

const command: SlashCommand = {
    category: 'Fun',
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Hace que el bot diga un mensaje ✨')
        .addStringOption(option =>
            option
                .setName('mensaje')
                .setDescription('El mensaje que quieres que el bot diga.')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const msg = interaction.options.getString('mensaje', true);

            // ❌ Bloquear menciones masivas
            if (msg.includes('@everyone') || msg.includes('@here')) {
                return interaction.editReply({
                    content: '🚫 No puedes mencionar a todos con este comando, nyaa~'
                });
            }

            const channel = interaction.channel;

            // ✅ Enviar solo si el canal permite mensajes
            if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel)) {
                await channel.send(msg);
                await interaction.editReply({ content: '✅ Mensaje enviado exitosamente, nyaa~' });
            } else {
                await interaction.editReply({
                    content: '❌ No puedo enviar mensajes en este tipo de canal, nyaa~'
                });
            }

        } catch (error: any) {
            console.error('❌ Error en comando say:', error);
            await interaction.editReply({
                content: '❌ Hubo un error al ejecutar el comando.'
            }).catch(() => {});
        }
    }
};

export = command;
