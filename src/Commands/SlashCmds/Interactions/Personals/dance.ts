// src/Commands/SlashCmds/Interactions/dance.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Message,
  GuildMember,
  User,
} from "discord.js";
import { HoshikoClient } from "../../../../index";
import { SlashCommand } from "../../../../Interfaces/Command";
import { getAnimeGif } from "../../../../Utils/animeGif";

const LINES = [
  "¡El suelo es tuyo esta noche! 🕺",
  "¡Nadie puede parar esto! 🎶",
  "¡Modo fiesta: activado! 🎉",
  "¡La pista de baile te pertenece! ✨",
];

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("dance")
    .setDescription("💃 Baila solo o arrastra a alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Con quién bailar (opcional)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario");
    const gif = await getAnimeGif("dance");
    const color =
      (interaction.member as GuildMember)?.displayHexColor || "#ce93d8";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const desc =
      target && target.id !== interaction.user.id
        ? `💃 **${interaction.user.username}** arrastra a **${target.username}** a la pista!\n\n*${line}*`
        : `💃 **${interaction.user.username}** se pone a bailar!\n\n*${line}*`;
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(desc)
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    const gif = await getAnimeGif("dance");
    const color = message.member?.displayHexColor || "#ce93d8";
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const desc =
      target && target.id !== message.author.id
        ? `💃 **${message.author.username}** arrastra a **${target.username}** a la pista!\n\n*${line}*`
        : `💃 **${message.author.username}** se pone a bailar!\n\n*${line}*`;
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(desc)
          .setImage(gif)
          .setTimestamp(),
      ],
    });
  },
};
export default command;
