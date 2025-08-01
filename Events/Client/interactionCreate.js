module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({ 
                content: "Command not found", 
                flags: [64] 
            });
        }
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Error in slash command ${interaction.commandName}:`, error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: [64]
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: [64]
                });
            }
        }
    }
};