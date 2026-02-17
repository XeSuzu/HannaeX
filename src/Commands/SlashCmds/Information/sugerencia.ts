import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
} from "discord.js";
import Suggestion from "../../../Models/suggestion";
import { HoshikoClient } from "../../../index";

interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<void | Message>;
}

const command: SlashCommand = {
  category: "Information",
  data: new SlashCommandBuilder()
    .setName("sugerencia")
    .setDescription("Envía una sugerencia para mejorar el bot, nyaa!")
    .addStringOption((option) =>
      option
        .setName("idea")
        .setDescription("Describe tu idea de actualización.")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const suggestionText = interaction.options.getString("idea", true);

    if (!interaction.guild) {
      return interaction.editReply({
        content: "Este comando solo se puede usar en un servidor.",
      });
    }

    try {
      const newSuggestion = new Suggestion({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        suggestion: suggestionText,
      });

      await newSuggestion.save();

      console.log(
        `✅ Sugerencia recibida de ${interaction.user.tag} en ${interaction.guild.name}: "${suggestionText}"`,
      );

      await interaction.editReply({
        content:
          "¡Gracias por tu sugerencia! Ha sido guardada exitosamente. 💖",
      });
    } catch (error: any) {
      console.error("Error al guardar la sugerencia:", error);
      await interaction.editReply({
        content: "Ocurrió un error al intentar guardar tu sugerencia, nyaa...",
      });
    }
  },
};

export = command;
