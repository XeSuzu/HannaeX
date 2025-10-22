import { Events, Interaction, ChatInputCommandInteraction, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from 'discord.js';
import { HoshikoClient } from '../../index';

type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: HoshikoClient) {
    if (!interaction.guild || !client.guilds.cache.has(interaction.guild.id)) return;

    const tag = `[PID:${process.pid}] id=${'id' in interaction ? interaction.id : 'na'}`;
    if (interaction.isRepliable()) {
      console.log(`${tag} kind=${interaction.type} in=${interaction.guild?.name} (${interaction.guild?.id})`);
    }

    const safeRespond = async (ix: AnyCtx, payload: any) => {
      try {
        if (ix.deferred && !ix.replied) {
          return await ix.editReply(payload);
        }
        if (!ix.replied) {
          return await ix.reply(payload);
        }
        return await ix.followUp(payload);
      } catch {
        try { return await ix.followUp(payload); } catch { /* nada */ }
      }
    };

    if (interaction.isChatInputCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);

      if (!cmd) {
        return safeRespond(interaction, {
          content: "❌ ¡Oops! Ese comando no existe, nyaa~",
          ephemeral: true
        });
      }

      try {
        await cmd.execute(interaction, client);
      } catch (error: any) {
        console.error(`💥 Error ejecutando /${interaction.commandName}:`, error);
        await handleCommandError(interaction, error, safeRespond);
      }
      return;
    }

    if (interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);

      if (!cmd) {
        return safeRespond(interaction as AnyCtx, {
          content: "❌ ¡Oops! Ese comando no existe, nyaa~",
          ephemeral: true
        });
      }

      try {
        await cmd.execute(interaction as any, client);
      } catch (error: any) {
        console.error(`💥 Error ejecutando contextual "${interaction.commandName}":`, error);
        await handleCommandError(interaction as AnyCtx, error, safeRespond);
      }
      return;
    }

  }
};

async function handleCommandError(interaction: AnyCtx, error: any, safeRespond: (ix: AnyCtx, p: any) => Promise<any>) {
  let errorMessage = "❌ Nyaa… hubo un error al ejecutar este comando. Intenta más tarde.";

  if (error?.code === 50013 || error?.code === 50001) {
    errorMessage = "❌ Me faltan permisos para hacer eso. Revisa los permisos del bot en este canal. Nyaa~ 🐾";
  }

  try {
    await safeRespond(interaction, { content: errorMessage, ephemeral: true });
  } catch (replyError) {
    console.error("No se pudo enviar el mensaje de error al usuario:", replyError);
  }
}
