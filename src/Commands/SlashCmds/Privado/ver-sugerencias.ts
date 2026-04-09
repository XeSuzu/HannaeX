import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import Suggestion from "../../../Models/suggestion";

const command: SlashCommand = {
  category: "Privado",
  cooldown: 5,
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("ver-sugerencias")
    .setDescription("Ve todas las sugerencias recibidas. (Solo para el dueño del bot)"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      return interaction.editReply({
        content: "No tienes permiso para usar este comando.",
      });
    }

    try {
      const suggestions = await Suggestion.find().sort({ timestamp: -1 });

      if (suggestions.length === 0) {
        return interaction.editReply({
          content: "No hay sugerencias nuevas. ¡Todo está perfecto! ✨",
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x87ceeb)
        .setTitle("📥 Sugerencias Recibidas");

      for (const sug of suggestions) {
        try {
          const user = await interaction.client.users.fetch(sug.userId);
          const userName = user ? user.tag : "Usuario Desconocido";

          embed.addFields({
            name: `De: ${userName}`,
            value: `> ${sug.suggestion}`,
            inline: false,
          });
        } catch {
          embed.addFields({
            name: "De: Usuario Desconocido",
            value: `> ${sug.suggestion}`,
            inline: false,
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: "Ocurrió un error al cargar las sugerencias.",
      });
    }
  },
};

export default command;
