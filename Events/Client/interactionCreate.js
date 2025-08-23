const { InteractionType, MessageFlags } = require('discord.js');

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        // Verificamos si la interacción es un comando de barra
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({ 
                content: "❌ ¡Oops! Parece que ese comando no existe. Nyaa~", 
                ephemeral: true 
            });
        }
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error); // Imprime el error completo en la consola
            
            // ===============================
            //  CONTROLADOR DE ERRORES MEJORADO
            // ===============================
            if (error.code === 50013 || error.code === 50001) {
                // Error de permisos: "Missing Permissions" o "Missing Access"
                const errorMessage = "❌ ¡Ay! Me falta un permiso para poder hacer eso. Por favor, asegúrate de que tengo los permisos necesarios para este canal o servidor. Nyaa~ 🐾";
                
                // Intenta responder en privado para que solo tú veas el error
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true });
                    }
                } catch (replyError) {
                    console.error("No se pudo enviar el mensaje de error:", replyError);
                }
            } else {
                // Cualquier otro tipo de error
                const genericErrorMessage = "❌ ¡Nyaa... me quedé dormidita! Hubo un error al ejecutar este comando. Por favor, intenta de nuevo más tarde.";
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: genericErrorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: genericErrorMessage, ephemeral: true });
                    }
                } catch (replyError) {
                    console.error("No se pudo enviar el mensaje de error genérico:", replyError);
                }
            }
        }
    }
};
