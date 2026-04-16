// src/Commands/SlashCmds/Interactions/sad.ts
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../../index";
import { SlashCommand } from "../../../../Interfaces/Command";

async function getAnimeGif(category: string): Promise<string> {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${category}`);
    const json = await res.json();
    return json.results[0].url;
  } catch {
    return "https://media.tenor.com/7X7HPs4.gif";
  }
}

const LINES = [
  "Los días grises también pasan. Aguanta~ 🤍",
  "No tienes que estar bien todo el tiempo.",
  "Aquí hay alguien que te escucha. 🌙",
  "Mañana puede ser diferente. Un paso a la vez.",
];

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("sad")
    .setDescription("🌧️ Expresa tu tristeza"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const gif = await getAnimeGif("sad");
    const color =
      (interaction.member as GuildMember)?.displayHexColor || "#78909c";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🌧️ **${interaction.user.username}** está triste...\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const gif = await getAnimeGif("sad");
    const color = message.member?.displayHexColor || "#78909c";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🌧️ **${message.author.username}** está triste...\n\n*${line}*`,
          )
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },
};
export default command;
