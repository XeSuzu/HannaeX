const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Suggestion = require('../../../Models/suggestion');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ver-sugerencias')
        .setDescription('Ve todas las sugerencias recibidas. (Solo para el dueño del bot)'),

    async execute(interaction) {
        // Asegúrate de que solo tú puedas usar este comando
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const suggestions = await Suggestion.find().sort({ timestamp: -1 });

            if (suggestions.length === 0) {
                return interaction.editReply({ content: 'No hay sugerencias nuevas. ¡Todo está perfecto! ✨' });
            }

            const embed = new EmbedBuilder()
                .setColor(0x87ceeb)
                .setTitle('📥 Sugerencias Recibidas');

            for (const sug of suggestions) {
                try {
                    // Aquí está el cambio importante: buscamos al usuario por su ID
                    const user = await interaction.client.users.fetch(sug.userId);
                    const userName = user ? user.tag : 'Usuario Desconocido';
                    
                    embed.addFields({
                        name: `De: ${userName}`,
                        value: `> ${sug.suggestion}`,
                        inline: false
                    });
                } catch (err) {
                    console.error('Error al obtener usuario de la sugerencia:', err);
                    embed.addFields({
                        name: 'De: Usuario Desconocido',
                        value: `> ${sug.suggestion}`,
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error al cargar las sugerencias:', error);
            await interaction.editReply({ content: 'Ocurrió un error al cargar las sugerencias.' });
        }
    },
};