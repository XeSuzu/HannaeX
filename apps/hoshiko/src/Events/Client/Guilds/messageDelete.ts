import { AuditLogEvent, EmbedBuilder, Events, Message, PartialMessage } from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { recordDeletedMessage } from "../../../Services/SnipeService";

export default {
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage, client: any): Promise<void> {
    if (message.author?.bot) return;
    if (!message.guild) return;
    if (message.id && HoshikoLogger.wasRecentBotMessageDelete(message.id)) {
      return;
    }

    // ─── 1. SNIPE ───────────────────────────────────────────────────────────
    if (message.author && message.content !== undefined) {
      const settings = await SettingsManager.getLite(
        message.guild.id,
        "securityModules.snipe",
      );

      if (settings?.securityModules?.snipe) {
        recordDeletedMessage(message);
      }
    }

    // ─── 2. MESSAGE LOG ─────────────────────────────────────────────────────
    const rawContent = message.content?.trim();
    const formattedContent = rawContent
      ? rawContent.slice(0, 1000)
      : "*No disponible en caché*";

    const user = message.author;
    const executor = await HoshikoLogger.fetchAuditExecutor(
      message.guild,
      AuditLogEvent.MessageDelete,
      user?.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Mensaje eliminado")
      .setColor(0xed4245)
      .addFields(
        {
          name: "Autor",
          value: user
            ? `<@${user.id}> (\`${user.tag}\`)`
            : "*No disponible en caché*",
          inline: true,
        },
        {
          name: "Canal",
          value: `<#${message.channelId}>`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    if (executor && executor.id !== user?.id) {
      embed.addFields({
        name: "Eliminado por",
        value: `<@${executor.id}> (\`${executor.tag}\`)`,
        inline: true,
      });
    }

    embed.addFields({
      name: "CONTENIDO",
      value: formattedContent,
      inline: false,
    });

    if (message.attachments && message.attachments.size > 0) {
      const attachUrls = message.attachments.map((a) => a.url).join("\n");
      embed.addFields({
        name: "Adjuntos",
        value: attachUrls.slice(0, 500),
        inline: false,
      });
    }

    embed.addFields({
      name: "ID del mensaje",
      value: `\`${message.id}\`${user ? ` • \`Autor:\` ${user.id}` : ""}`,
      inline: false,
    });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(message.guild, "messagelog", embed);
  },
};
