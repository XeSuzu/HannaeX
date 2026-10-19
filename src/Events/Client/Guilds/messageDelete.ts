import { AuditLogEvent, EmbedBuilder, Events, Message, PartialMessage } from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import GlobalProfile from "../../../Database/moderation/globalProfile.model";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { sendFirstDeleteNotice } from "../../../Services/SnipeConsentService";
import { recordDeletedMessage } from "../../../Services/SnipeService";

export default {
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage, client: any): Promise<void> {
    if (message.author?.bot) return;
    if (!message.guild) return;

    // ─── 1. SNIPE ───────────────────────────────────────────────────────────
    if (message.author && message.content !== undefined) {
      const settings = await SettingsManager.getLite(
        message.guild.id,
        "securityModules.snipe",
      );

      if (settings?.securityModules?.snipe) {
        await recordDeletedMessage(message);

        // Aviso en canal solo la primera vez que borra en este servidor
        const profile = await GlobalProfile.findOne({
          userId: message.author.id,
        });
        const alreadyNotified = profile?.snipeNotifiedGuilds?.includes(
          message.guild.id,
        );

        if (!alreadyNotified) {
          await sendFirstDeleteNotice(
            message.author.id,
            message.guild,
            message.channelId,
            client,
          );
          await GlobalProfile.findOneAndUpdate(
            { userId: message.author.id },
            { $addToSet: { snipeNotifiedGuilds: message.guild.id } },
            { upsert: true },
          );
        }
      }
    }

    // ─── 2. MESSAGE LOG ─────────────────────────────────────────────────────
    const content = message.content ?? "[no disponible — no estaba en caché]";
    const user = message.author;
    const executor = await HoshikoLogger.fetchAuditExecutor(
      message.guild,
      AuditLogEvent.MessageDelete,
      user?.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Mensaje Eliminado")
      .setColor(0xff6b6b)
      .addFields(
        { name: "Contenido", value: content.slice(0, 1024) || "[vacío]" },
        { name: "Canal", value: `<#${message.channelId}>`, inline: true },
        {
          name: "Autor",
          value: user ? `${user.tag} \`(${user.id})\`` : "[desconocido]",
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (executor && executor.id !== user?.id) {
      embed.addFields({
        name: "Eliminado por",
        value: `${executor.tag} \`(${executor.id})\``,
        inline: true,
      });
    }

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(message.guild, "messagelog", embed);
  },
};
