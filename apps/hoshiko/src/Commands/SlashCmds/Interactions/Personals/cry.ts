// src/Commands/SlashCmds/Interactions/cry.ts
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { SlashCommand } from "../../../../Interfaces/Command";
import {
  getAnimeGif,
  resolveInteractionColor,
  resolveInteractionTarget,
} from "../../../../Utils/animeGif";

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
    const member = interaction.member as GuildMember;
    const color = resolveInteractionColor(member, "#90caf9");

    if (!target || target.id === interaction.user.id) {
      const gif = await getAnimeGif("cry");
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
      const gif = await getAnimeGif("cuddle");
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
    const target = await resolveInteractionTarget(message, args);
    const color = resolveInteractionColor(message.member, "#90caf9");

    if (!target || target.id === message.author.id) {
      const gif = await getAnimeGif("cry");
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
      const gif = await getAnimeGif("cuddle");
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
