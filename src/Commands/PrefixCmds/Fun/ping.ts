import { Message } from "discord.js";
import { HoshikoClient } from "../../../index";
import { PrefixCommand } from "../../../Interfaces/Command"; 

//  Le decimos a TypeScript: "Oye, este objeto ES un PrefixCommand"
const command: PrefixCommand = {
  name: "ping",
  description: "Muestra la latencia del bot 🏓",

  // TypeScript ahora sabe que message, args y client son correctos porque cumplen el contrato
  async execute(message: Message, args: string[], client: HoshikoClient) {
    const sent = await message.reply("🏓 ...");

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    await sent.edit(
      `🏓 **Pong!**\n📡 Latencia: **${latency}ms**\n🌐 API: **${apiPing}ms**`,
    );
  },
};

export default command;