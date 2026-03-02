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
    .setName("sugerencia")
    .setDescription("💡 Envía una sugerencia para mejorar el bot, nyaa!"),
  // 👆 Sin options, el modal los reemplaza

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("sugerenciaModal")
      .setTitle("💡 ¿Tienes una idea?");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("ideaInput")
          .setLabel("Describe tu sugerencia")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Me gustaría que Hoshiko pudiera...")
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000),
      ),
    );

    await interaction.showModal(modal);
  },
};

export default command;
