import { Events, Message, PartialMessage, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { handleWordFilter } from "../../../Features/automod/wordFilter";
import { handleLinkProtection } from "../../../Features/linkProtector";
import { evaluateHighStressMessage } from "../../../Features/automod/aiModeration";

export default {
  name: Events.MessageUpdate,
  async execute(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
    client: any
  ): Promise<void> {
    if (newMessage.author?.bot) return;
    if (!newMessage.guild) return;

    const oldContent = oldMessage.content ?? "";
    const newContent = newMessage.content ?? "";
    if (oldContent === newContent || !newContent.trim()) return;

    const formattedOld = oldContent
      ? oldContent.slice(0, 900)
      : "*No disponible en caché*";
    const formattedNew = newContent
      ? newContent.slice(0, 900)
      : "*No disponible en caché*";

    const user = newMessage.author;
    const channel = newMessage.channel;

    const embed = new EmbedBuilder()
      .setTitle("✏️ Mensaje editado")
      .setColor(0xfaa61a)
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
          value: `<#${channel.id}>`,
          inline: true,
        },
        {
          name: "Enlace",
          value: `[Ir al mensaje](https://discord.com/channels/${newMessage.guild.id}/${channel.id}/${newMessage.id})`,
          inline: true,
        },
        { name: "ANTES", value: formattedOld, inline: false },
        { name: "DESPUÉS", value: formattedNew, inline: false },
        {
          name: "ID del mensaje",
          value: `\`${newMessage.id}\`${user ? ` • \`Autor:\` ${user.id}` : ""}`,
          inline: false,
        },
      )
      .setURL(`https://discord.com/channels/${newMessage.guild.id}/${channel.id}/${newMessage.id}`)
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    if (user) embed.setThumbnail(user.displayAvatarURL());

    await HoshikoLogger.sendToChannel(newMessage.guild, "messagelog", embed);

    // Re-evaluación preventiva de AutoMod sobre el mensaje editado
    const fullMessage = (
      newMessage.partial
        ? await newMessage.fetch().catch(() => newMessage)
        : newMessage
    ) as Message;

    const wordFilterHit = await handleWordFilter(fullMessage);
    if (!wordFilterHit) {
      const linkHit = await handleLinkProtection(fullMessage);
      if (!linkHit) {
        void evaluateHighStressMessage(fullMessage);
      }
    }
  },
};

