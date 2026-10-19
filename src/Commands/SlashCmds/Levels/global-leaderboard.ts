import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";

export default {
  data: new SlashCommandBuilder()
    .setName("global-leaderboard")
    .setDescription("🌐 Top global de usuarios por XP (todos los servidores)")
    .addIntegerOption((o) =>
      o
        .setName("pagina")
        .setDescription("Página del ranking (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    _client: HoshikoClient,
  ) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("🌐 Global Leaderboard en mantenimiento")
          .setDescription(
            "El **Ranking Global** se encuentra temporalmente desactivado.\n\n" +
              "🏆 Usa `/leaderboard` para consultar la tabla de posiciones de este servidor.",
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp(),
      ],
    });
  },
};
