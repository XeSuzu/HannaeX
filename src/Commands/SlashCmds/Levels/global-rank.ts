import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";

export default {
  data: new SlashCommandBuilder()
    .setName("globalrank")
    .setDescription("🌸 Ver tu rango y stats globales en todos los servidores")
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Usuario a consultar")
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
          .setTitle("🌐 Ranking Global en mantenimiento")
          .setDescription(
            "El sistema de **Rango Global** se encuentra temporalmente desactivado mientras optimizamos la progresión entre servidores.\n\n" +
              "✨ Puedes consultar tu nivel y estadísticas en este servidor usando `/rank` o `/vcrank`.",
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp(),
      ],
    });
  },
};
