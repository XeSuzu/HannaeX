import {
  SlashCommandBuilder,
  EmbedBuilder,
  version as djsVersion,
} from "discord.js";
import mongoose from "mongoose";
import { PerformanceMonitor } from "../../../Security"; // Asegúrate que la ruta sea correcta

export default {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("📊 Estadísticas vitales y salud del sistema."),

  async execute(interaction: any, client: any) {
    // 1. Calculamos el ping real del bot (Ida y vuelta)
    const sent = await interaction.deferReply({ fetchReply: true });
    const botPing = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = client.ws.ping;

    // 2. Datos del sistema
    const stats = PerformanceMonitor.getSystemStats();

    // 3. Estado de MongoDB (Vital para saber si el bot funciona bien)
    // 1 = Conectado, 0 = Desconectado, 2 = Conectando
    const dbState = mongoose.connection.readyState;
    const dbStatus =
      dbState === 1
        ? "🟢 Online"
        : dbState === 2
          ? "🟡 Connecting"
          : "🔴 Offline";

    const statsEmbed = new EmbedBuilder()
      .setTitle(`📊 Estado del Sistema: ${client.user.username}`)
      .setColor(0x2f3136) // Un gris oscuro elegante
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        // Fila 1: Signos Vitales
        {
          name: "🔌 Latencia",
          value: `**Bot:** ${botPing}ms\n**API:** ${apiPing}ms`,
          inline: true,
        },
        {
          name: "💾 Base de Datos",
          value: `**Mongo:** ${dbStatus}`,
          inline: true,
        },
        {
          name: "⏱️ Tiempo Activo",
          value: `\`${stats.uptime}\``,
          inline: true,
        },

        // Fila 2: Recursos (Aquí verás el ahorro de RAM)
        {
          name: "🧠 Memoria (RAM)",
          value: `**Uso:** \`${stats.ramUsage}\`\n**Total:** \`${stats.ramAllocated}\``,
          inline: true,
        },
        {
          name: "💻 Software",
          value: `**Node:** ${stats.nodeVersion}\n**Discord.js:** v${djsVersion}`,
          inline: true,
        },
        { name: "⚡ CPU", value: `\`${stats.cpuLoad}\``, inline: true },
      )
      .setFooter({ text: `Hoshiko Security | PID: ${process.pid}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });
  },
};
