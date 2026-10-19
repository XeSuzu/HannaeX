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
    const rawContent = message.content?.trim();
    const formattedContent = rawContent
      ? `> ${rawContent.slice(0, 1000).replace(/\n/g, "\n> ")}`
      : "*[Sin texto o no disponible en caché]*";

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
        {
          name: "👤 Autor",
          value: user ? `<@${user.id}>\n\`${user.tag}\`` : "*[Desconocido]*",
          inline: true,
        },
        {
          name: "💬 Canal",
          value: `<#${message.channelId}>`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (executor && executor.id !== user?.id) {
      embed.addFields({
        name: "👮 Eliminado por",
        value: `<@${executor.id}>\n\`${executor.tag}\``,
        inline: true,
      });
    }

    embed.addFields({
      name: "📝 Contenido Eliminado",
      value: formattedContent,
      inline: false,
    });

    if (message.attachments && message.attachments.size > 0) {
      const attachUrls = message.attachments.map((a) => a.url).join("\n");
      embed.addFields({
        name: "📎 Adjuntos",
        value: attachUrls.slice(0, 500),
        inline: false,
      });
    }

    embed.addFields({
      name: "🆔 Identificadores",
      value: `\`Autor:\` ${user?.id ?? "N/A"} • \`Msg:\` ${message.id}`,
      inline: false,
    });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(message.guild, "messagelog", embed);
  },
};
