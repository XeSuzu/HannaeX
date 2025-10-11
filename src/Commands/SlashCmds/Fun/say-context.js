const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('say')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        // Lógica para el comando contextual
        if (!interaction.isMessageContextMenuCommand()) return;

        const targetMsg = interaction.targetMessage;
        
        // Reemplaza 'ephemeral: true' con 'flags: MessageFlags.Ephemeral'
        await interaction.reply({ content: '✅ Mensaje enviado.', flags: MessageFlags.Ephemeral });
        
        await targetMsg.reply({
            content: `${interaction.user.username} dice: ${targetMsg.content || '*(mensaje sin texto)*'}`
        });
    }
};