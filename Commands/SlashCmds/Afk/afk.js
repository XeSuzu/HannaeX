const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const AFK = require("../../../Models/afk.js"); // Usa el modelo global

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("😽 Marca que estás AFK")
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Opcional: Por qué estás AFK 🐾")
        .setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString("razon") || "Estoy ausente 🐾";

    // Guardar o actualizar AFK por usuario y servidor
    await AFK.findOneAndUpdate(
      { userId: interaction.user.id, guildId: interaction.guildId },
      { reason, timestamp: Date.now() },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("😽 Ahora estas AFK, notificaré a cualquiera que te mencione")
      .setDescription(
        `Ahora estás AFK ${interaction.user.username} 🐾\n> Razón: ${reason}\n> Tiempo: 0 minuto(s)`
      )
      .setTimestamp()
      .setFooter({ text: "Un pequeño descanso... 🐱💗" });

    await interaction.reply({ embeds: [embed] });
  },
};
