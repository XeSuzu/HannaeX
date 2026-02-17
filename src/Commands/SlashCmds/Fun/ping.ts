import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { HoshikoClient } from "../../../index";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Muestra la latencia del bot."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // 1. Enviamos un mensaje temporal y pedimos el objeto de vuelta (fetchReply)
    const sent = await interaction.reply({
      content: "🏓 Calculando...",
      fetchReply: true,
    });

    // 2. Matemáticas simples (Resta de tiempos)
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    // 3. Editamos el mensaje con el resultado final
    await interaction.editReply({
      content: `🏓 **Pong!**\n📶 Latencia: **${latency}ms**\n💻 API: **${apiPing}ms**`,
    });
  },
};
