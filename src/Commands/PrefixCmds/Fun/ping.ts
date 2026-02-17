import { Message } from "discord.js";
import { HoshikoClient } from "../../../index";

const command = {
  name: "ping",
  description: "Muestra la latencia del bot 🏓",

  async execute(message: Message, args: string[], client: HoshikoClient) {
    const sent = await message.reply("🏓 ...");

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    await sent.edit(
      `🏓 **Pong!**\n📡 Latencia: **${latency}ms**\n🌐 API: **${apiPing}ms**`,
    );
  },
};

export = command;
