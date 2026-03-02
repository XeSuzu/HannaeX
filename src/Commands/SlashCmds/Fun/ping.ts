import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Muestra la latencia del bot."),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    // El defer ya fue hecho por interactionCreate
    // Calculamos latencia desde que Discord recibió la interacción hasta ahora
    const latency = Date.now() - interaction.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    await interaction.editReply({
      content: `🏓 **Pong!**\n📶 Latencia: **${latency}ms**\n💻 API: **${apiPing}ms**`,
    });
  },
};

export default command;
