import { Events, Interaction } from 'discord.js';
import { HoshikoClient } from '../../index'; // Importamos nuestra interfaz de cliente personalizada

export = {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: HoshikoClient) {

        // ⚡ Ignora interacciones fuera de servidores donde el bot está presente
        if (!interaction.guild || !client.guilds.cache.has(interaction.guild.id)) return;

        // ------------------------
        // Slash Commands
        // ------------------------
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                const reply = { content: "❌ ¡Oops! Parece que ese comando no existe. Nyaa~", ephemeral: true };
                return interaction.deferred ? interaction.editReply(reply) : interaction.reply(reply);
            }

            try {
                await command.execute(interaction, client);
            } catch (error: any) {
                console.error(`💥 Error ejecutando el comando /${interaction.commandName}:`, error);
                await handleCommandError(interaction, error);
            }
            return;
        }

        // ------------------------
        // Menús contextuales (clic derecho -> Apps)
        // ------------------------
        if (interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    content: "❌ ¡Oops! Parece que ese comando no existe. Nyaa~",
                    ephemeral: true
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (error: any) {
                console.error(`💥 Error ejecutando comando contextual "${interaction.commandName}":`, error);
                await handleCommandError(interaction, error);
            }
            return;
        }

        // ------------------------
        // Aquí puedes agregar más tipos de interacciones (botones, selects, modals, etc.)
        // ------------------------
        // if (interaction.isButton()) { ... }
        // if (interaction.isStringSelectMenu()) { ... }
    }
};

// ------------------------
// Manejo centralizado de errores
// ------------------------
async function handleCommandError(interaction: any, error: any) {
    let errorMessage = "❌ ¡Nyaa... me quedé dormidita! Hubo un error al ejecutar este comando. Por favor, intenta de nuevo más tarde.";

    // Errores de permisos
    if (error.code === 50013 || error.code === 50001) {
        errorMessage = "❌ ¡Ay! Me falta un permiso para poder hacer eso. Por favor, asegúrate de que tengo los permisos necesarios en este canal. Nyaa~ 🐾";
    }

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    } catch (replyError) {
        console.error("No se pudo enviar el mensaje de error al usuario:", replyError);
    }
}
