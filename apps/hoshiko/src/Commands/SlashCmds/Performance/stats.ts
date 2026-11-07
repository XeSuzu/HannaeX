import {
  SlashCommandBuilder,
  EmbedBuilder,
  version as djsVersion,
  ChatInputCommandInteraction,
} from "discord.js";
import mongoose from "mongoose";
import { PerformanceMonitor } from "../../../Security";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";

const command: SlashCommand = {
  category: "Performance",
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("📊 Estadísticas vitales y salud del sistema."),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    
    // 1. Calculamos el ping real del bot (Ida y vuelta)
    // ✅ NUEVO: Como el Guardián ya hizo el defer, solo "jalamos" el mensaje
    const sent = await interaction.fetchReply(); 
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
      .setTitle(`📊 Estado del Sistema: ${client.user?.username}`)
      .setColor(0x5bc0be)
      .setDescription("Métricas operativas y salud de la infraestructura de Hoshiko ✨")
      .setThumbnail(client.user?.displayAvatarURL() || null)
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

        // Fila 2: Recursos
        {
          name: "🧠 Memoria (RAM)",
          value: `**Uso:** \`${stats.ramUsage}\`\n**Total:** \`${stats.ramAllocated}\``,
          inline: true,
        },
        {
          name: "💻 Software",
          value: `**Hoshiko:** v2.0.0\n**Node:** ${stats.nodeVersion}\n**Discord.js:** v${djsVersion}`,
          inline: true,
        },
        { name: "⚡ CPU", value: `\`${stats.cpuLoad}\``, inline: true },
      )
      .setFooter({ text: `Hoshiko v2.0.0 • PID: ${process.pid}` })
      .setTimestamp();

    // ✅ RESPONDEMOS CON EDITREPLY
    await interaction.editReply({ embeds: [statsEmbed] });
  },
};
export default command;