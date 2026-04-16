// src/Commands/SlashCmds/Interactions/cry.ts
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

const SOLO_LINES = [
  "A veces llorar está bien. Aquí estoy contigo~ 🤍",
  "Suelta todo lo que necesites. No hay juicio aquí.",
  "Llorar no es debilidad. Es ser humano.",
  "Estoy aquí. No estás sol@.",
];

const TARGET_LINES = [
  "quiere que sepas que está aquí para ti~",
  "te manda todas las buenas vibras del universo",
  "te dice que todo va a pasar",
  "te abraza con el corazón",
];

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("cry")
    .setDescription("😢 Llora o consuela a alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("A quién consolar (opcional)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario");
    const gif = await getAnimeGif("cry");
    const member = interaction.member as GuildMember;
    const color = member?.displayHexColor || "#90caf9";

    if (!target || target.id === interaction.user.id) {
      const line = SOLO_LINES[Math.floor(Math.random() * SOLO_LINES.length)];
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(color as any)
            .setDescription(
              `😢 **${interaction.user.username}** está llorando...\n\n*${line}*`,
            )
            .setImage(gif)
            .setTimestamp(),
        ],
      });
    } else {
      const line =
        TARGET_LINES[Math.floor(Math.random() * TARGET_LINES.length)];
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(color as any)
            .setDescription(
              `💙 **${interaction.user.username}** ${line}, **${target.username}**~`,
            )
            .setImage(gif)
            .setTimestamp(),
        ],
      });
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    const gif = await getAnimeGif("cry");
    const color = message.member?.displayHexColor || "#90caf9";

    if (!target || target.id === message.author.id) {
      const line = SOLO_LINES[Math.floor(Math.random() * SOLO_LINES.length)];
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color as any)
            .setDescription(
              `😢 **${message.author.username}** está llorando...\n\n*${line}*`,
            )
            .setImage(gif)
            .setTimestamp(),
        ],
      });
    } else {
      const line =
        TARGET_LINES[Math.floor(Math.random() * TARGET_LINES.length)];
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color as any)
            .setDescription(
              `💙 **${message.author.username}** ${line}, **${target.username}**~`,
            )
            .setImage(gif)
            .setTimestamp(),
        ],
      });
    }
  },
};
export default command;
