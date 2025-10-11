import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { HoshikoClient } from '../../../index'; // Ajusta la ruta a tu index.ts

// ✨ MEJORA: Creamos una interfaz común para todos tus slash commands.
// Deberías mover esto a un archivo de tipos compartido (ej: src/types.ts) para reutilizarlo.
interface SlashCommand {
    data: SlashCommandBuilder;
    category: string; // Añadimos la categoría como propiedad obligatoria.
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void>;
}

const command: SlashCommand = {
    // Añadimos la categoría a este comando para que se clasifique a sí mismo.
    category: 'Information', 
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('¡Muestra todos los comandos disponibles, nyaa!'),

    async execute(interaction) {
        // Hacemos un "casting" para que TypeScript sepa que 'client' es nuestro HoshikoClient.
        const client = interaction.client as HoshikoClient;
        const commands = client.slashCommands;
        
        // Tipamos el objeto que agrupará los comandos.
        const categorizedCommands: Record<string, string[]> = {};

        // 1. Agrupamos los comandos por categoría.
        // Le decimos a TS que cada 'command' en la colección debe cumplir nuestra interfaz.
        commands.forEach((command: SlashCommand) => {
            // Ahora 'category' es una propiedad segura de obtener.
            const category = command.category || 'Otros'; 
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push(`\`/${command.data.name}\` - ${command.data.description}`);
        });

        // 2. Creamos el embed (tu lógica se mantiene, ya es excelente).
        const helpEmbed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle('💖 Mi guía de ayuda Nyaa~! 🐾')
            .setDescription('¡Hola, soy Hoshiko! Nya~ Aquí tienes una guía de todos mis comanditos disponibles.')
            .setThumbnail(client.user?.displayAvatarURL() ?? null)

        // 3. Añadimos los campos con emojis.
        for (const category in categorizedCommands) {
            const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            let emoji = '✨'; // Emoji por defecto
            
            if (category === 'Fun') emoji = '🐱';
            if (category === 'Information') emoji = '📚';
            if (category === 'Moderation') emoji = '🛡️';
            // ... (el resto de tus emojis)

            helpEmbed.addFields({
                name: `${emoji} ${capitalizedCategory}`,
                value: categorizedCommands[category].join('\n') || 'No hay comandos aquí, nyaa.',
                inline: false,
            });
        }
        
        // 4. Campo especial para la IA.
        helpEmbed.addFields({
            name: '🧠 Inteligencia Artificial',
            value: `¡Puedes **mencionarme** en cualquier canal para hablar conmigo! Por ejemplo: \`@${client.user?.username} ¿Qué es un agujero de gusano?\``,
            inline: false
        });

        helpEmbed
            .setTimestamp()
            .setFooter({ text: 'Powered by Hoshiko & v.sxn 💖' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },
};

export = command;