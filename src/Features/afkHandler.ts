import { Message, EmbedBuilder } from "discord.js";
import AFK from "../Models/afk";

export default async (message: Message): Promise<boolean> => {
  if (!message.guild || message.author.bot) return false;

  let handled = false;

  // Parte A: el autor tenía estado AFK y volvió — borrar registro y avisar
  const authorAfkData = await AFK.findOneAndDelete({
    userId: message.author.id,
    guildId: message.guild.id,
  });

  if (authorAfkData) {
    const member = message.member;

    // Restaurar apodo original si fue modificado por el bot
    if (member && member.manageable && member.displayName.startsWith("[AFK]")) {
      const original = authorAfkData.originalNickname || member.user.username;
      const cleanNick = original.replace("[AFK] ", "").substring(0, 32);
      await member.setNickname(cleanNick).catch(() => {});
    }

    const timestamp = Math.floor(authorAfkData.timestamp.getTime() / 1000);
    const embedReturn = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("Has vuelto")
      .setDescription(`Estuviste ausente <t:${timestamp}:R>`)
      .setFooter({ text: "Aviso temporal" });

    const msg = await message
      .reply({ embeds: [embedReturn] })
      .catch(() => null);
    if (msg) setTimeout(() => msg.delete().catch(() => {}), 10000);

    handled = true;
  }

  // Parte B: alguien mencionó a usuarios — notificar si están AFK
  if (message.mentions.users.size > 0) {
    const mentionedUsers = message.mentions.users.filter(
      (u) => !u.bot && u.id !== message.author.id,
    );

    if (mentionedUsers.size > 0) {
      const afkUsersData = await AFK.find({
        userId: { $in: Array.from(mentionedUsers.keys()) },
        guildId: message.guild.id,
      });

      if (afkUsersData.length > 0) {
        // Agrupar respuestas para una sola notificación compacta
        const afkList = afkUsersData
          .map((afk) => {
            const user = mentionedUsers.get(afk.userId);
            const name = user?.username || "Usuario";
            const time = Math.floor(afk.timestamp.getTime() / 1000);
            return `**${name}** está AFK — <t:${time}:R>\n"${afk.reason}"`;
          })
          .join("\n\n");

        const embedMention = new EmbedBuilder()
          .setColor(0xffb6c1)
          .setAuthor({ name: "Usuarios ausentes" })
          .setDescription(afkList)
          .setFooter({ text: "Aviso temporal" });

        const msg = await message
          .reply({ embeds: [embedMention] })
          .catch(() => null);
        if (msg) setTimeout(() => msg.delete().catch(() => {}), 10000);

        handled = true;
      }
    }
  }

  return handled;
};
