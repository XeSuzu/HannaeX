import {
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

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Purga Masiva de Mensajes")
      .setColor(0xff0000)
      .addFields(
        {
          name: "Mensajes eliminados",
          value: `**${humanMessages.size}** de humanos (${messages.size} total)`,
          inline: true,
        },
        { name: "Canal", value: `<#${channel.id}>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    await HoshikoLogger.sendToChannel(channel.guild, "messagelog", embed);
  },
};
