import { EmbedBuilder, Message } from "discord.js";
import { HoshikoClient } from "../../../index";
import { PrefixCommand } from "../../../Interfaces/Command";

const command: PrefixCommand = {
  name: "ping",
  description: "muestra la latencia del bot 🏓",

  async execute(message: Message, args: string[], client: HoshikoClient) {
    // calculamos la latencia de un solo golpe
    const messagePing = Date.now() - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    // armamos el embed
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        `🏓 **pong!**\n` +
          `✉️ mensajes: **${messagePing}ms**\n` +
          `🌐 api: **${apiPing}ms**`,
      );

    // respondemos directo sin viajes extra
    await message.reply({ embeds: [embed] });
  },
};

export default command;
