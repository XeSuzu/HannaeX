const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const mongoose = require("mongoose");

// ==== MODELO DE PAREJA ====
const coupleSchema = new mongoose.Schema({
  users: { type: [String], required: true, unique: true },
  kisses: { type: Number, default: 0 },
});
const Couple = mongoose.models.Couple || mongoose.model("Couple", coupleSchema);

// ==== GIFS ====
const kissGifs = [
  "https://i.pinimg.com/originals/4e/6e/7e/4e6e7e9783821452fd9a3e5517058c68.gif",
];

const returnGifs = [
  "https://31.media.tumblr.com/ea7842aad07c00b098397bf4d00723c6/tumblr_n570yg0ZIv1rikkvpo1_500.gif",
];

const rejectGifs = [
  "https://i.pinimg.com/originals/71/89/b3/7189b36e4a0ef770cda47d2f65747ef1.gif",
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("😽 Manda un besito kawaii a alguien (nya~)")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("¿A quién quieres darle un besito, nya~? 🐾")
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const authorUser = interaction.user;

    if (targetUser.id === authorUser.id) {
      return interaction.reply({
        content: "Nyaa~ ¡no puedes besarte a ti mism@, gatit@ travies@! 🐾😽",
        ephemeral: true,
      });
    }

    // ==== ACTUALIZAR CONTADOR DE PAREJA ====
    const coupleIds = [authorUser.id, targetUser.id].sort();
    let coupleData = await Couple.findOneAndUpdate(
      { users: coupleIds },
      { $inc: { kisses: 1 } },
      { new: true, upsert: true }
    );

    // ==== EMBED PRINCIPAL ====
    const embed = new EmbedBuilder()
      .setColor(0xff9eb5)
      .setTitle("💖 Nyaa~ ¡momento de besitos!")
      .setDescription(
        `**${authorUser}** le dio un besito a **${targetUser}** 😽\n\n` +
          `💞 Entre **${authorUser.username}** y **${targetUser.username}** ya se han dado **${coupleData.kisses}** besitos compartidos, nya~ ✨`
      )
      .setImage(getRandom(kissGifs))
      .setFooter({ text: "Ronroneos y mimos incluidos 🐱💗" })
      .setTimestamp();

    // ==== BOTONES ====
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("return_kiss")
        .setLabel("😽 Devolver besito")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("reject_kiss")
        .setLabel("🚫 Rechazar besito")
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    // ==== COLECTOR DE BOTÓN ====
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== targetUser.id) {
        return i.reply({
          content: "Solo la persona besada puede interactuar, nya~ 😼",
          ephemeral: true,
        });
      }

      if (i.customId === "return_kiss") {
        // ==== DEVOLUCIÓN ====
        let coupleDataReturn = await Couple.findOneAndUpdate(
          { users: coupleIds },
          { $inc: { kisses: 1 } },
          { new: true, upsert: true }
        );

        const returnEmbed = new EmbedBuilder()
          .setColor(0xffbfd6)
          .setTitle("💖 Nyaa~ ¡besito correspondido!")
          .setDescription(
            `**${targetUser}** ronronea y devuelve un besito a **${authorUser}** 😽\n\n` +
              `💞 Entre **${authorUser.username}** y **${targetUser.username}** ya se han dado **${coupleDataReturn.kisses}** besitos compartidos, kyaaa~ ✨`
          )
          .setImage(getRandom(returnGifs))
          .setFooter({ text: "Mimos infinitos 🐾💗" })
          .setTimestamp();

        await i.update({ embeds: [returnEmbed], components: [] });
      }

      if (i.customId === "reject_kiss") {
        // ==== RECHAZO ====
        const rejectEmbed = new EmbedBuilder()
          .setColor(0x9e9e9e)
          .setTitle("💔 Nyaa~ ¡besito rechazado!")
          .setDescription(
            `**${targetUser}** decide no aceptar el besito de **${authorUser}** 😿\n\n` +
              "A veces el corazón necesita espacio, nya~"
          )
          .setImage(getRandom(rejectGifs))
          .setFooter({ text: "Respetemos los sentimientos kawaii 🐾💗" })
          .setTimestamp();

        await i.update({ embeds: [rejectEmbed], components: [] });
      }
    });
  },
};
