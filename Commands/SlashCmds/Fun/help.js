const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('¡Muestra todos los comandos disponibles, nyaa!'),

    async execute(interaction) {
        const commands = interaction.client.slashCommands;
        const categorizedCommands = {};

        // 1. Agrupamos los comandos por categoría
        commands.forEach(command => {
            const category = command.category || 'Otros';
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push(`\`/${command.data.name}\` - ${command.data.description}`);
        });

        // 2. Creamos el embed con el nuevo diseño
        const helpEmbed = new EmbedBuilder()
            .setColor(0xffc0cb) // Un color rosa pastel para un toque más dulce 🌸
            .setTitle('💖 Mi guía de ayuda Nyaa~! 🐾')
            .setDescription('¡Hola, soy HannaeX! Nya~ Aquí tienes una guía de todos mis comanditos disponibles para darle vida a tus chats.')
            .setThumbnail(interaction.client.user.displayAvatarURL());

        // 3. Añadimos los campos con emojis lindos
        for (const category in categorizedCommands) {
            const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            let emoji = '✨'; // Emoji por defecto
            
            // Asignamos un emoji según la categoría
            if (category === 'Fun') emoji = '🐱';
            if (category === 'Information') emoji = '📚';
            if (category === 'Interactions') emoji = '💞';
            if (category === 'Moderation') emoji = '🛡️';
            if (category === 'Leaderboards') emoji = '🏆';
            if (category === 'Profiles') emoji = '👤';


            helpEmbed.addFields({
                name: `${emoji} ${capitalizedCategory}`,
                value: categorizedCommands[category].join('\n') || `No hay comandos en esta categoría, nyaa.`,
                inline: false,
            });
        }
        
        // 4. Campo especial para la IA
        helpEmbed.addFields({
            name: '🧠 Inteligencia Artificial',
            value: `¡Puedes **mencionar a HannaeX** en cualquier canal para que te responda con su inteligencia! Por ejemplo: \`@${interaction.client.user.username} ¿Qué es un agujero de gusano?\``,
            inline: false
        });

        helpEmbed
            .setTimestamp()
            .setFooter({ text: 'Powered by v.sxn 💖' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },
};