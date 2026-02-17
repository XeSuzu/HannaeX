import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import Confession from "../../../Models/Confession";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confession-check")
    .setDescription(
      "🕵️‍♂️ Auditoría Forense: Revela los metadatos de un caso (Admin)",
    )
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("Número de expediente (ID de la publicación)")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    // 🔒 1. Verificación de Seguridad
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "⛔ **Acceso Denegado:** Credenciales insuficientes.",
        ephemeral: true,
      });
    }

    const targetId = interaction.options.getInteger("id", true);
    await interaction.deferReply({ ephemeral: true });

    // 🔍 2. Búsqueda en Base de Datos
    const evidence = await Confession.findOne({
      guildId: interaction.guildId,
      confessionId: targetId,
    });

    if (!evidence) {
      return interaction.editReply(
        `❌ **Error 404:** El expediente **#${targetId}** no consta en los archivos.`,
      );
    }

    // 🕵️‍♂️ 3. Investigación del Usuario
    let userTag = evidence.authorTag;
    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    let status = "🔻 DESCONOCIDO (Fuera del radar)";
    let color = 0x2f3136; // Gris oscuro (Técnico/Desconocido)

    try {
      const user = await interaction.client.users.fetch(evidence.authorId);
      userTag = user.tag;
      avatarUrl = user.displayAvatarURL({ size: 512 });
      status = "🟢 ACTIVO (Localizado)";
      color = 0x5865f2; // Blurple (Color oficial de Discord/Sistema)
    } catch (e) {}

    // 4. 🎨 DISEÑO HOSHIKO UI (Expediente Secreto)
    const auditEmbed = new EmbedBuilder()
      .setAuthor({
        name: `EXPEDIENTE DE INVESTIGACIÓN #${targetId}`,
        iconURL: "https://cdn-icons-png.flaticon.com/512/1022/1022484.png", // Icono de Lupa/Investigación
      })
      .setColor(color as any)
      .setThumbnail(avatarUrl)
      .addFields(
        {
          name: "👤 SUJETO IDENTIFICADO",
          // Usamos bloque YAML para alineación técnica perfecta
          value: `\`\`\`yaml\nTag: ${userTag}\nID:  ${evidence.authorId}\nEstado: ${status}\`\`\``,
          inline: false,
        },
        {
          name: "📅 METADATA DEL CASO",
          // Mostramos los nuevos datos (Modo y Tipo)
          value: `> **Fecha:** <t:${Math.floor(evidence.timestamp.getTime() / 1000)}:f>\n> **Modo:** ${evidence.isAnonymous ? "🔒 Anónimo" : "🔓 Público"}\n> **Tipo:** ${evidence.replyToId ? `↩️ Respuesta al caso #${evidence.replyToId}` : "📝 Publicación Original"}`,
          inline: false,
        },
        {
          name: "📝 TRANSCRIPCIÓN",
          value: `>>> ${evidence.content}`,
        },
      )
      .setFooter({
        text: `System Audit ID: ${evidence._id} • Solo para ojos autorizados`,
      })
      .setTimestamp();

    // Si había imagen adjunta
    if (evidence.imageUrl) {
      auditEmbed.setImage(evidence.imageUrl);
      auditEmbed.addFields({
        name: "📸 EVIDENCIA ADJUNTA",
        value: `[🔗 Abrir enlace de imagen](${evidence.imageUrl})`,
      });
    }

    await interaction.editReply({ embeds: [auditEmbed] });
  },
};
