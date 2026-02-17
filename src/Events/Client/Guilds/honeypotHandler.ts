import { Events, Message, PermissionFlagsBits } from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const settings = await SettingsManager.getSettings(message.guild.id);

    // Verificamos si el canal donde se escribió es el canal Honeypot configurado
    if (
      settings.honeypotChannel &&
      message.channel.id === settings.honeypotChannel
    ) {
      try {
        // 1. Eliminar el mensaje para no dejar rastro
        await message.delete().catch(() => {});

        // 2. Banear al "usuario" (bot de raid) inmediatamente
        await message.guild.members.ban(message.author.id, {
          reason:
            "Hoshiko Security: Activación de Honeypot (Bot de Raid detectado).",
        });

        // 3. Avisar al Staff
        if (settings.modLogChannel) {
          const logChannel = message.guild.channels.cache.get(
            settings.modLogChannel,
          );
          if (logChannel?.isTextBased()) {
            await (logChannel as any).send(
              `🪤 **¡TRAMPA ACTIVADA!**\nEl usuario \`${message.author.tag}\` ha sido baneado automáticamente por interactuar con el canal Honeypot.`,
            );
          }
        }
      } catch (err) {
        console.error("Error al ejecutar ban de Honeypot:", err);
      }
    }
  },
};
