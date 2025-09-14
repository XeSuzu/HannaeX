const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// ==== MODELO AFK ====
const afkSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, default: "Estoy ausente, nya~ 🐾" },
  timestamp: { type: Date, default: Date.now },
});

const AFK = mongoose.models.AFK || mongoose.model("AFK", afkSchema);

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

    // Guardar o actualizar AFK
    await AFK.findOneAndUpdate(
      { userId: interaction.user.id },
      { reason, timestamp: Date.now() },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("😽 Ahora estas AFK, notificare a cualquiera que te mencione")
      .setDescription(
        `Ahora estás AFK ${interaction.user.username} 🐾\n> Razón: ${reason}\n> Tiempo: 0 minuto(s)`
      )
      .setTimestamp()
      .setFooter({ text: "Un pequeño descanso... 🐱💗" });

    await interaction.reply({ embeds: [embed] });
  },
};
