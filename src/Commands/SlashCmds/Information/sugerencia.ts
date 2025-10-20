import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import Suggestion from '../../../Models/suggestion'; // Importamos el modelo ya migrado
import { HoshikoClient } from '../../../index';

// Interfaz estándar para tus slash commands
interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message>;
}

const command: SlashCommand = {
    category: 'Information', // O la categoría que prefieras
    data: new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Envía una sugerencia para mejorar el bot, nyaa!')
        .addStringOption(option =>
            option.setName('idea')
                .setDescription('Describe tu idea de actualización.')
                .setRequired(true)),

    async execute(interaction) {
        // Hacemos que la respuesta sea efímera (solo visible para el usuario)
        await interaction.deferReply({ ephemeral: true });
        
        // Usamos 'true' para que TS sepa que la opción siempre existirá
        const suggestionText = interaction.options.getString('idea', true);
        
        // Verificamos que la interacción ocurra en un servidor
        if (!interaction.guild) {
            return interaction.editReply({ content: 'Este comando solo se puede usar en un servidor.' });
        }
        
        try {
            // Creamos un nuevo documento con la sugerencia y lo guardamos
            const newSuggestion = new Suggestion({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                suggestion: suggestionText,
            });

            await newSuggestion.save();

            console.log(`✅ Sugerencia recibida de ${interaction.user.tag} en ${interaction.guild.name}: "${suggestionText}"`);

            await interaction.editReply({ content: '¡Gracias por tu sugerencia! Ha sido guardada exitosamente. 💖' });

        } catch (error: any) {
            console.error('Error al guardar la sugerencia:', error);
            await interaction.editReply({ content: 'Ocurrió un error al intentar guardar tu sugerencia, nyaa...' });
        }
    },
};

export = command;