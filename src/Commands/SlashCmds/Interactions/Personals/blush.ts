// src/Commands/SlashCmds/Interactions/blush.ts
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../../index";
import { SlashCommand } from "../../../../Interfaces/Command";
import { getAnimeGif } from "../../../../Utils/animeGif";

const LINES = [
  "¡Qué cute! No te pongas así~ 🌸",
  "¡Demasiado adorable! 💕",
  "Ese rubor lo dice todo~ 🌷",
  "¡No puedo! Es demasiado tiern@! 🥺",
];

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("blush")
    .setDescription("🌸 Te sonrojas"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const gif = await getAnimeGif("blush");
    const color =
      (interaction.member as GuildMember)?.displayHexColor || "#f48fb1";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🌸 **${interaction.user.username}** se sonroja~\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const gif = await getAnimeGif("blush");
    const color = message.member?.displayHexColor || "#f48fb1";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🌸 **${message.author.username}** se sonroja~\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },
};
export default command;
