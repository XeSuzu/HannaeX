import { 
  Events, 
  Interaction, 
  ChatInputCommandInteraction, 
  MessageContextMenuCommandInteraction, 
  UserContextMenuCommandInteraction 
} from 'discord.js';
import { HoshikoClient } from '../../index';
import { HoshikoLogger, LogLevel } from '../../Security/Logger/HoshikoLogger';

type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: HoshikoClient) {
    // 1. Logging básico para saber qué está pasando
    const tag = `[PID:${process.pid}] id=${interaction.id}`;
    if (interaction.isRepliable()) {
      const location = interaction.guild ? `guild="${interaction.guild.name}"` : 'DM';
      console.log(`${tag} kind=${interaction.type} ${location}`);
    }

    // --- Función para responder de forma segura ---
    const safeRespond = async (ix: any, payload: any) => {
      try {
        if (ix.deferred && !ix.replied) return await ix.editReply(payload);
        if (!ix.replied) return await ix.reply(payload);
        return await ix.followUp(payload);
      } catch {
        try { return await ix.followUp(payload); } catch { /* Silencio 🌸 */ }
      }
    };

    // 🧠 2. Procesar SLASH COMMANDS y CONTEXT MENUS
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      // 🔒 Validación: Los comandos solo funcionan en servidores
      if (!interaction.guild) return;

      const cmd = client.slashCommands.get(interaction.commandName) || client.commands.get(interaction.commandName);

      if (!cmd) {
        return safeRespond(interaction as AnyCtx, {
          content: "❌ ¡Oops! Ese comando no existe en mi base de datos, nyaa~",
          ephemeral: true
        });
      }

      try {
        await cmd.execute(interaction as any, client);
      } catch (error: any) {
        console.error(`💥 Error en "${interaction.commandName}":`, error);
        await handleCommandError(interaction as AnyCtx, error, safeRespond);
      }
      return; 
    }

    // 👤 3. Lógica Especial: ANTI-ALT (Verificación por Botón)
    if (interaction.isButton() && interaction.customId.startsWith('verify_alt_')) {
        const userId = interaction.customId.split('_')[2];
        
        if (interaction.user.id !== userId) {
            return await interaction.reply({ 
                content: '🌸 Nyaa... este botón no es para ti, corazón.', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferUpdate();
            const guilds = client.guilds.cache;

            for (const [guildId, guild] of guilds) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    await HoshikoLogger.sendLog(
                        guild,
                        "✅ Verificación Exitosa",
                        `El usuario **${member.user.tag}** ha pasado la prueba del Anti-Alt.`,
                        0x00ff00,
                        member.user
                    );
                }
            }

            await interaction.editReply({
                content: '✨ ¡Gracias por verificar que eres humano! Ya puedes disfrutar del servidor. 🌸',
                embeds: [],
                components: []
            });

            HoshikoLogger.log({
                level: LogLevel.INFO,
                context: 'Security/AntiAlt',
                message: `Usuario ${interaction.user.tag} verificado correctamente.`,
            });
        } catch (err) {
            console.error("❌ Error en verificación Anti-Alt:", err);
        }
        return;
    }

    // ⚙️ 4. Procesar otros componentes (Modales, Menús de Setup, etc.)
    if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        console.log(`[DEBUG] Componente recibido: ${interaction.customId}`);
        // Los collectors de /setup se encargarán de esto si el comando está vivo.
    }
  }
};

/**
 * Manejador de errores
 */
async function handleCommandError(interaction: AnyCtx, error: any, safeRespond: (ix: AnyCtx, p: any) => Promise<any>) {
  let errorMessage = "❌ Nyaa… hubo un error al ejecutar este comando.";
  if (error?.code === 50013 || error?.code === 50001) {
    errorMessage = "❌ Me faltan permisos para hacer eso. Revisa mis roles, nyaa~ 🐾";
  }
  try {
    await safeRespond(interaction, { content: errorMessage, ephemeral: true });
  } catch (replyError) {
    console.error("No se pudo enviar el mensaje de error:", replyError);
  }
}