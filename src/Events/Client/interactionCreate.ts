import { Events, Interaction } from 'discord.js';
import { HoshikoClient } from '../../index'; // Importamos nuestra interfaz de cliente personalizada

export = {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction, client: HoshikoClient) {
        // 1. Usamos un "type guard" para asegurarnos de que la interacción es un comando.
        //    TypeScript ahora sabe que dentro de este 'if', 'interaction' tiene métodos como .commandName
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) {
            // Usamos editReply si la respuesta ya fue diferida, por seguridad.
            if (interaction.deferred) {
                return interaction.editReply({ 
                    content: "❌ ¡Oops! Parece que ese comando no existe. Nyaa~"
                });
            }
            return interaction.reply({ 
                content: "❌ ¡Oops! Parece que ese comando no existe. Nyaa~", 
                ephemeral: true 
            });
        }
        
        try {
            await command.execute(interaction, client);
        } catch (error: any) { // Le damos un tipo al error
            console.error(`💥 Error ejecutando el comando /${interaction.commandName}:`, error);
            
            // ===============================
            //  CONTROLADOR DE ERRORES MEJORADO CON TIPOS
            // ===============================
            let errorMessage = "❌ ¡Nyaa... me quedé dormidita! Hubo un error al ejecutar este comando. Por favor, intenta de nuevo más tarde.";

            // Error de permisos: "Missing Permissions" o "Missing Access"
            if (error.code === 50013 || error.code === 50001) {
                errorMessage = "❌ ¡Ay! Me falta un permiso para poder hacer eso. Por favor, asegúrate de que tengo los permisos necesarios en este canal. Nyaa~ 🐾";
            }
            
            try {
                // Esta lógica unificada maneja todos los casos (respondido, diferido o nuevo)
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError) {
                console.error("No se pudo enviar el mensaje de error al usuario:", replyError);
            }
        }
    }
};