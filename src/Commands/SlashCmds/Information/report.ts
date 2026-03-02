import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Information",
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("🐛 Reporta un bug o error encontrado en Hoshiko."),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("reportBugModal")
      .setTitle("🐛 Reportar un Bug");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("descripcionInput")
          .setLabel("¿Qué sucedió?")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Explica el error con el mayor detalle posible...")
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("capturaInput")
          .setLabel("URL de captura de pantalla (Opcional)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://i.imgur.com/ejemplo.png")
          .setRequired(false),
      ),
    );

    await interaction.showModal(modal);
  },
};

export default command;
