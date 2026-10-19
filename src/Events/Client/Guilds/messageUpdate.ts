import { Events, Message, PartialMessage, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.MessageUpdate,
  async execute(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
    client: any
  ): Promise<void> {
    if (newMessage.author?.bot) return;
    if (!newMessage.guild) return;

    const oldContent = oldMessage.content ?? "[no disponible]";
    const newContent = newMessage.content ?? "[no disponible]";
    if (oldContent === newContent) return;

    const formattedOld = oldContent
      ? `> ${oldContent.slice(0, 900).replace(/\n/g, "\n> ")}`
      : "*[Sin texto anterior]*";
    const formattedNew = newContent
      ? `> ${newContent.slice(0, 900).replace(/\n/g, "\n> ")}`
      : "*[Sin texto nuevo]*";

    const user = newMessage.author;
    const channel = newMessage.channel;

    const embed = new EmbedBuilder()
      .setTitle("📝 Mensaje Editado")
      .setColor(0xffa500)
      .addFields(
        {
          name: "👤 Usuario",
          value: user ? `<@${user.id}>\n\`${user.tag}\`` : "*[Desconocido]*",
          inline: true,
        },
        {
          name: "💬 Canal",
          value: `<#${channel.id}>`,
          inline: true,
        },
        {
          name: "🔗 Enlace",
          value: `[Ir al mensaje](https://discord.com/channels/${newMessage.guild.id}/${channel.id}/${newMessage.id})`,
          inline: true,
        },
        { name: "⏮️ Antes", value: formattedOld, inline: false },
        { name: "⏭️ Después", value: formattedNew, inline: false },
        {
          name: "🆔 Identificadores",
          value: `\`Usuario:\` ${user?.id ?? "N/A"} • \`Msg:\` ${newMessage.id}`,
          inline: false,
        },
      )
      .setURL(`https://discord.com/channels/${newMessage.guild.id}/${channel.id}/${newMessage.id}`)
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(newMessage.guild, "messagelog", embed);
  },
};
