import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
// Asegúrate de que la ruta de importación sea correcta según tu estructura de carpetas
import { snipes } from '../../../Events/Client/Guilds/messageDelete'; 
import { HoshikoClient } from '../../../index';

export default {
    data: new SlashCommandBuilder()
        .setName('snipe') // Le quité el "test", ya está listo para producción 😉
        .setDescription('Recupera mensajes borrados recientemente 🕵️‍♀️')
        .addIntegerOption(opt => 
            opt.setName('numero')
               .setDescription('Qué mensaje ver (1 = último borrado, 2 = penúltimo...)')
               .setMinValue(1)
               .setMaxValue(10)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
        // Obtenemos el número que pidió el usuario (o 1 por defecto)
        const position = interaction.options.getInteger('numero') || 1;
        // Restamos 1 porque los Arrays empiezan en 0
        const index = position - 1;

        // Buscamos la lista de mensajes de este canal
        const channelSnipes = snipes.get(interaction.channelId);

        // Verificamos si existe la lista y si existe ese mensaje específico
        if (!channelSnipes || !channelSnipes[index]) {
            return interaction.reply({ 
                content: index === 0 
                    ? 'Nyaa~ no hay mensajes borrados recientes en este canal. 🧹' 
                    : `Solo tengo guardados **${channelSnipes?.length || 0}** mensajes borrados aquí.`,
                ephemeral: true 
            });
        }

        const msg = channelSnipes[index];

        const embed = new EmbedBuilder()
            .setColor('Random') // O usa 0xffc0cb si prefieres el rosa fijo
            .setAuthor({ 
                name: `${msg.author} borró esto:`, 
                iconURL: msg.authorAvatar // 👈 Aquí usamos SU foto, no la del bot
            })
            .setDescription(msg.content)
            .setFooter({ 
                text: `Snipe ${position}/${channelSnipes.length} • Atrapado por Hoshiko 🐾` 
            })
            .setTimestamp(msg.timestamp); // Pone la hora exacta del borrado

        if (msg.image) embed.setImage(msg.image);

        await interaction.reply({ embeds: [embed] });
    },
};