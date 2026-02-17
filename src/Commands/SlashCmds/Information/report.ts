import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import { HoshikoClient } from "../../../index";

// ✅ TIPO CORREGIDO: Usamos Promise<any> para evitar errores de retorno
interface SlashCommand {
  data: SlashCommandBuilder | any;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<any>;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("🐛 Reporta un bug o error encontrado en Hoshiko.")
    .addStringOption((option) =>
      option
        .setName("descripcion")
        .setDescription("Explica qué sucedió con el mayor detalle posible.")
        .setRequired(true)
        .setMinLength(10),
    )
    .addAttachmentOption((option) =>
      option
        .setName("captura")
        .setDescription(
          "Adjunta una captura de pantalla del error (Muy útil).",
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // Deferimos la respuesta (privada) para que el bot tenga tiempo de procesar la imagen
    await interaction.deferReply({ ephemeral: true });

    // 1. RECOGER DATOS
    const description = interaction.options.getString("descripcion", true);
    const attachment = interaction.options.getAttachment("captura");

    // 👇 AQUÍ LA VARIABLE DE ENTORNO
    const LOG_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;

    // Validaciones de seguridad
    if (!LOG_CHANNEL_ID) {
      return interaction.editReply({
        content:
          "❌ **Error de Configuración:** El canal de reportes no está definido en el `.env`.",
      });
    }

    const reportChannel = client.channels.cache.get(
      LOG_CHANNEL_ID,
    ) as TextChannel;

    if (!reportChannel) {
      return interaction.editReply({
        content:
          "❌ **Error de Conexión:** No pude conectar con el servidor central de reportes.",
      });
    }

    try {
      // ==========================================
      // 🕵️ PASO A: PANEL PARA TI (EL DEV)
      // ==========================================
      const devEmbed = new EmbedBuilder()
        .setTitle("🚨 NUEVA INCIDENCIA REGISTRADA")
        .setColor(Colors.Red) // Rojo Alerta
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          {
            name: "👤 Reportero",
            value: `**${interaction.user.tag}**\n🆔 ${interaction.user.id}`,
            inline: true,
          },
          {
            name: "🏠 Ubicación",
            value: `**${interaction.guild?.name || "DM"}**\n🆔 ${interaction.guildId}`,
            inline: true,
          },
          {
            name: "📅 Fecha",
            value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: false,
          },
          {
            name: "📝 Descripción del Bug",
            value: `\`\`\`\n${description}\n\`\`\``,
          },
        )
        .setFooter({ text: "Hoshiko Debug System • v2.0 Beta" });

      // Si hay imagen, la añadimos al embed
      if (attachment) {
        devEmbed.setImage(attachment.url);
        devEmbed.addFields({
          name: "📎 Adjunto",
          value: "[Ver Imagen Original](" + attachment.url + ")",
        });
      }

      // Enviamos el reporte a tu canal secreto
      await reportChannel.send({ embeds: [devEmbed] });

      // ==========================================
      // 🎫 PASO B: TICKET PARA EL USUARIO (PANEL)
      // ==========================================
      const userEmbed = new EmbedBuilder()
        .setColor(Colors.Green) // Verde Éxito
        .setTitle("✅ Reporte Enviado con Éxito")
        .setDescription(
          "He notificado al equipo de desarrollo sobre este problema. ¡Gracias por ayudar a pulir mis sistemas! 💖",
        )
        .addFields(
          {
            name: "🆔 ID de Referencia",
            value: `\`#BUG-${Date.now().toString().slice(-6)}\``,
            inline: true,
          },
          { name: "📁 Estado", value: "`En Revisión` 🕵️", inline: true },
        )
        .setFooter({ text: "Tu feedback es muy valioso para Hoshiko." });

      // Añadimos un botón decorativo (Deshabilitado) para que parezca un ticket oficial
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("sent_status")
          .setLabel("Enviado al Desarrollador")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📨")
          .setDisabled(true), // Solo decorativo
      );

      await interaction.editReply({ embeds: [userEmbed], components: [row] });
    } catch (error) {
      console.error("❌ Error crítico en comando Report:", error);
      await interaction.editReply({
        content:
          "❌ **Error Crítico:** Algo explotó al intentar enviar el reporte. Qué ironía...",
      });
    }
  },
};

export default command;
