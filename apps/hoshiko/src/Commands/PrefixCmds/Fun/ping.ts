import { EmbedBuilder, Message } from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { PrefixCommand } from "../../../Interfaces/Command";

const command: PrefixCommand = {
  name: "ping",
  description: "muestra la latencia del bot 🏓",

  async execute(message: Message, args: string[], client: HoshikoClient) {
    const apiPing = Math.max(0, Math.round(client.ws.ping));
    const messagePing = Math.max(1, Date.now() - message.createdTimestamp);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        `🏓 **pong!**\n` +
          `✉️ mensajes: **${messagePing}ms**\n` +
          `🌐 api: **${apiPing}ms**`,
      );

    await message.reply({ embeds: [embed] });
  },
};

export default command;
