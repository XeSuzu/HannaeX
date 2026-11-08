// src/Commands/SlashCmds/Interactions/wave.ts
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

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("wave")
    .setDescription("👋 Saluda a alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("A quién saludar (opcional)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario");
    const gif = await getAnimeGif("wave");
    const color = resolveInteractionColor(
      interaction.member as GuildMember,
      "#80cbc4",
    );
    const desc =
      target && target.id !== interaction.user.id
        ? `👋 **${interaction.user.username}** le saluda a **${target.username}**~ ¡Hola!`
        : `👋 **${interaction.user.username}** saluda a todos. ¡Hola a quienes estén mirando!`;
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
    const target = await resolveInteractionTarget(message, args);
    const gif = await getAnimeGif("wave");
    const color = resolveInteractionColor(message.member, "#80cbc4");
    const desc =
      target && target.id !== message.author.id
        ? `👋 **${message.author.username}** le saluda a **${target.username}**~ ¡Hola!`
        : `👋 **${message.author.username}** saluda a todos. ¡Hola a quienes estén mirando!`;
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
