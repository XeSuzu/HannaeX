import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Fun",
  cooldown: 3,
  defer: false,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 muestra la latencia del bot."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const apiPing = Math.max(0, Math.round(client.ws.ping));
    const latency = Math.max(1, Date.now() - interaction.createdTimestamp);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        `🏓 **pong!**\n` +
          `✉️ latencia: **${latency}ms**\n` +
          `🌐 api: **${apiPing}ms**`,
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
