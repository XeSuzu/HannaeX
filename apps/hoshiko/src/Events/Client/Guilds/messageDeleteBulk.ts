import {
  AuditLogEvent,
  Events,
  Message,
  PartialMessage,
  EmbedBuilder,
  Collection,
  Snowflake,
  GuildTextBasedChannel,
} from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.MessageBulkDelete,
  async execute(
    messages: Collection<Snowflake, Message | PartialMessage>,
    channel: GuildTextBasedChannel,
    client: any
  ): Promise<void> {
    if (!channel.guild) return;

    const humanMessages = messages.filter((m) => !m.author?.bot);
    if (humanMessages.size === 0) return;

    const executor = await HoshikoLogger.fetchAuditExecutor(
      channel.guild,
      AuditLogEvent.MessageBulkDelete,
    );

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Purga masiva de mensajes")
      .setColor(0xed4245)
      .addFields(
        { name: "Canal", value: `<#${channel.id}>`, inline: true },
        {
          name: "Mensajes eliminados",
          value: `**${humanMessages.size}** de usuarios (${messages.size} total)`,
          inline: true,
        },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(channel.guild, "messagelog", embed);
  },
};
