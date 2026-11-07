import {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  UserContextMenuCommandInteraction,
} from "discord.js";

export type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export async function safeRespond(ix: AnyCtx, payload: any) {
  try {
    if (payload.ephemeral) {
      payload.flags = MessageFlags.Ephemeral;
      delete payload.ephemeral;
    }
    if (ix.deferred && !ix.replied) {
      const editPayload = { ...payload };
      delete editPayload.flags;
      return await ix.editReply(editPayload);
    }
    if (!ix.replied) return await ix.reply(payload);
    return await ix.followUp(payload);
  } catch {
    try {
      return await ix.followUp(payload);
    } catch {}
  }
}

export async function handleCommandError(
  interaction: AnyCtx,
  error: Error,
  safeRespondFn: (ix: AnyCtx, p: any) => Promise<any>,
) {
  let errorMessage =
    "😿 ¡Miau! Algo se rompió dentro de mí... Ya le avisé a mis creadores para que lo arreglen.";
  if ((error as any)?.code === 50013 || (error as any)?.code === 50001)
    errorMessage =
      "⛔ No puedo hacer eso... ¿Podrías revisar si tengo los permisos necesarios, porfi? 🥺";
  try {
    await safeRespondFn(interaction, {
      content: errorMessage,
      ephemeral: true,
    });
  } catch {}
}
