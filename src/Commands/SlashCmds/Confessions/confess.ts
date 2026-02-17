import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Envía una confesión anónima al servidor"),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("confessionModal")
      .setTitle("Tu Confesión Anónima");

    const confessionInput = new TextInputBuilder()
      .setCustomId("confessionInput")
      .setLabel("¿Qué quieres confesar?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Escribe aquí tu secreto... (Nadie sabrá que fuiste tú)")
      .setRequired(true)
      .setMaxLength(2000);

    const firstActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(confessionInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  },
};
