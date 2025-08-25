const { SlashCommandBuilder } = require('discord.js');
const Suggestion = require('../../../Models/suggestion'); // Importa el nuevo modelo

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Envía una sugerencia para mejorar el bot, nyaa!')
        .addStringOption(option =>
            option.setName('idea')
                .setDescription('Describe tu idea de actualización.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const suggestion = interaction.options.getString('idea');
        
        try {
            // Creamos un nuevo documento con la sugerencia y la guardamos
            const newSuggestion = new Suggestion({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                suggestion: suggestion
            });

            await newSuggestion.save();

            // Enviamos una confirmación al usuario
            await interaction.editReply({ content: '¡Gracias por tu sugerencia! Ha sido guardada exitosamente. 💖' });

        } catch (error) {
            console.error('Error al guardar la sugerencia:', error);
            await interaction.editReply({ content: 'Ocurrió un error al intentar guardar tu sugerencia, nyaa...' });
        }
    },
};