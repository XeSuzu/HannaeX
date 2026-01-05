import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { snipes } from '../../../Events/Client/Guilds/messageDelete'; // Importamos la colección
import { HoshikoClient } from '../../../index';

export default {
    data: new SlashCommandBuilder()
        .setName('snipetest')
        .setDescription('¡Atrapa el último mensaje borrado del canal! 🎯'),

    async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
        const msg = snipes.get(interaction.channelId);

        if (!msg) {
            return interaction.reply({ 
                content: 'Nyaa~ no encontré ningún mensaje borrado recientemente en este canal. 🐾', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setAuthor({ name: `Mensaje de ${msg.author}`, iconURL: client.user?.displayAvatarURL() })
            .setDescription(msg.content)
            .setFooter({ text: `Atrapado por Hoshiko 🐾 • <t:${Math.floor(msg.timestamp / 1000)}:R>` });

        if (msg.image) embed.setImage(msg.image);

        await interaction.reply({ embeds: [embed] });
    },
};