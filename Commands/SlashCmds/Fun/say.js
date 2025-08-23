const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Hace que el bot diga un mensaje (puede responder a alguien)')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('El mensaje que quieres que el bot diga')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Lógica para el comando slash
        if (!interaction.isChatInputCommand()) return;

        const msg = interaction.options.getString('message');
        if (msg.includes('@everyone') || msg.includes('@here')) {
            return interaction.reply({
                content: '🚫 No puedes mencionar a todos con este comando.',
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.reply({ content: '✅ Mensaje enviado.', flags: MessageFlags.Ephemeral });
        await interaction.channel.send(msg);
    }
};