const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('¡Muestra todos los comandos disponibles, nyaa!'),

    async execute(interaction) {
        const commands = interaction.client.slashCommands;

        const funCommands = [];
        const infoCommands = [];
        const interactionCommands = [];
        const moderationCommands = [];

        // Iteramos sobre todos los comandos para categorizarlos
        commands.forEach(command => {
            const commandName = command.data.name;
            const commandDescription = command.data.description;
            
            // Usamos una lógica simple para categorizar los comandos
            if (['help', 'ping', 'say-context', 'say'].includes(commandName)) {
                funCommands.push(`\`/${commandName}\` - ${commandDescription}`);
            } else if (['avatar', 'info-creator', 'userinfo'].includes(commandName)) {
                infoCommands.push(`\`/${commandName}\` - ${commandDescription}`);
            } else if (['hug', 'kiss'].includes(commandName)) {
                interactionCommands.push(`\`/${commandName}\` - ${commandDescription}`);
            } else if (['tempmute'].includes(commandName)) {
                moderationCommands.push(`\`/${commandName}\` - ${commandDescription}`);
            }
        });

        // Creamos el embed de ayuda con todos los detalles
        const helpEmbed = new EmbedBuilder()
            .setColor(0xFFA500) // Un color cálido y acogedor
            .setTitle('¡Mi guia de ayuda nya! 💖')
            .setDescription('¡Hola, soy HannaeX! Aquí tienes una guía de mis comandos. ¡Usa los comandos de barra para jugar conmigo!')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '✨ Diversión', value: funCommands.join('\n') || 'No hay comandos de diversión disponibles.' },
                { name: '📚 Información', value: infoCommands.join('\n') || 'No hay comandos de información disponibles.' },
                { name: '💞 Interacciones', value: interactionCommands.join('\n') || 'No hay comandos de interacción disponibles.' },
                { name: '🛡️ Moderación', value: moderationCommands.join('\n') || 'No hay comandos de moderación disponibles.' },
                // Nuevo campo para la IA
                { name: '🤖 Inteligencia Artificial', value: `¡Además de mis comandos, puedes **mencionarme** en cualquier canal para que te responda con mi inteligencia! Por ejemplo: \`@${interaction.client.user.username} ¿Qué significa el universo?\`` }
            )
            .setTimestamp()
            .setFooter({ text: '¡Usa un comando de barra para acariciarme! 🐾' });

        // Enviamos el embed al canal, nyaa.
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },
};