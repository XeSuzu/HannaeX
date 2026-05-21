import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 muestra la latencia del bot."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // calculamos la latencia desde que discord recibió la interacción
    const latency = Date.now() - interaction.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    // armamos el embed minimalista
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(
        `🏓 **pong!**\n` +
          `✉️ latencia: **${latency}ms**\n` +
          `🌐 api: **${apiPing}ms**`,
      );

    // editamos la respuesta diferida borrando cualquier texto previo
    await interaction.editReply({ content: null, embeds: [embed] });
  },
};

export default command;
