import { 
  Events, 
  Interaction, 
  ChatInputCommandInteraction, 
  MessageContextMenuCommandInteraction, 
  UserContextMenuCommandInteraction 
} from 'discord.js';
import { HoshikoClient } from '../../index';

type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: HoshikoClient) {
    // 1. Validar que estemos en un servidor 🏠
    if (!interaction.guild || !client.guilds.cache.has(interaction.guild.id)) return;

    // 2. Logging de la interacción (¡Súper útil!) ✨
    const tag = `[PID:${process.pid}] id=${interaction.id}`;
    if (interaction.isRepliable()) {
      console.log(`${tag} kind=${interaction.type} guild="${interaction.guild.name}"`);
    }

    // --- Función para responder de forma segura ---
    const safeRespond = async (ix: AnyCtx, payload: any) => {
      try {
        if (ix.deferred && !ix.replied) return await ix.editReply(payload);
        if (!ix.replied) return await ix.reply(payload);
        return await ix.followUp(payload);
      } catch {
        try { return await ix.followUp(payload); } catch { /* Silencio total 🌸 */ }
      }
    };

    // 3. Procesar Slash Commands y Context Menus 🧠
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);

      if (!cmd) {
        return safeRespond(interaction as AnyCtx, {
          content: "❌ ¡Oops! Ese comando no existe en mi base de datos, nyaa~",
          ephemeral: true
        });
      }

      try {
        // --- Aquí podrías añadir lógica de Cooldowns en el futuro ---
        await cmd.execute(interaction as any, client);
      } catch (error: any) {
        console.error(`💥 Error en "${interaction.commandName}":`, error);
        await handleCommandError(interaction as AnyCtx, error, safeRespond);
      }
    }
  }
};

/**
 * Manejador de errores tierno pero informativo 🐾
 */
async function handleCommandError(interaction: AnyCtx, error: any, safeRespond: (ix: AnyCtx, p: any) => Promise<any>) {
  let errorMessage = "❌ Nyaa… hubo un error al ejecutar este comando. Inténtalo más tarde.";

  // Errores comunes de Discord (Permisos)
  if (error?.code === 50013 || error?.code === 50001) {
    errorMessage = "❌ Me faltan permisos para hacer eso. Revisa mis roles en este canal, nyaa~ 🐾";
  }

  try {
    await safeRespond(interaction, { content: errorMessage, ephemeral: true });
  } catch (replyError) {
    console.error("No se pudo enviar el mensaje de error:", replyError);
  }
}