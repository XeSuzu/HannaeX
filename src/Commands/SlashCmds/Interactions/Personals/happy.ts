// src/Commands/SlashCmds/Interactions/happy.ts
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
  "¡Esa energía es contagiosa! 🎉",
  "¡Hoy es un buen día y se nota! ✨",
  "¡Felicidad desbloqueada! 🌟",
  "¡Esa sonrisa vale todo! 💛",
];

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("happy")
    .setDescription("🎉 Expresa tu felicidad"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const gif = await getAnimeGif("happy");
    const color =
      (interaction.member as GuildMember)?.displayHexColor || "#ffd54f";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🎉 **${interaction.user.username}** está feliz!\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const gif = await getAnimeGif("happy");
    const color = message.member?.displayHexColor || "#ffd54f";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🎉 **${message.author.username}** está feliz!\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },
};
export default command;
