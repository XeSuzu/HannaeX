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

    const user = newMessage.author;
    const channel = newMessage.channel;

    const embed = new EmbedBuilder()
      .setTitle("📝 Mensaje Editado")
      .setColor(0xffa500)
      .addFields(
        { name: "Antes", value: oldContent.slice(0, 1024) || "[vacío]" },
        { name: "Después", value: newContent.slice(0, 1024) || "[vacío]" },
        { name: "Canal", value: `<#${channel.id}>`, inline: true },
        {
          name: "Usuario",
          value: user ? `${user.tag} \`(${user.id})\`` : "[desconocido]",
          inline: true,
        }
      )
      .setURL(`https://discord.com/channels/${newMessage.guild.id}/${channel.id}/${newMessage.id}`)
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Message Log" });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(newMessage.guild, "messagelog", embed);
  },
};
