import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import Confession from "../../../Models/Confession";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Confessions",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("confession-check")
    .setDescription("🔍 Nyaa~ Investiga quién envió una publicación (Solo admins)")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("El número de la publicación a investigar")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: "⛔ Nyaa~ No tienes permiso para esto." });
      return;
    }

    const targetId = interaction.options.getInteger("id", true);

    const evidence = await Confession.findOne({
      guildId: interaction.guildId,
      confessionId: targetId,
    });

    if (!evidence) {
      await interaction.editReply({
        content: `🐾 No encontré ninguna publicación con el ID **#${targetId}**...`,
      });
      return;
    }

    let userTag = evidence.authorTag;
    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    let status = "😿 Fuera del radar";
    let color = 0x2f3136;

    try {
      const user = await interaction.client.users.fetch(evidence.authorId);
      userTag = user.tag;
      avatarUrl = user.displayAvatarURL({ size: 512 });
      status = "🌸 Localizado~";
      color = 0xff9ecd;
    } catch (e) {}

    const auditEmbed = new EmbedBuilder()
      .setAuthor({
        name: `🔎 Investigación de Publicación #${targetId}`,
        iconURL: "https://cdn-icons-png.flaticon.com/512/1022/1022484.png",
      })
      .setColor(color as any)
      .setThumbnail(avatarUrl)
      .addFields(
        {
          name: "🐱 Autor Identificado",
          value: `\`\`\`yaml\nTag: ${userTag}\nID: ${evidence.authorId}\nEstado: ${status}\`\`\``,
          inline: false,
        },
        {
          name: "🌷 Detalles de la Publicación",
          value: `> **Fecha:** <t:${Math.floor(evidence.timestamp.getTime() / 1000)}:f>\n> **Modo:** ${evidence.isAnonymous ? "🔒 Anónimo" : "🔓 Público"}\n> **Tipo:** ${evidence.replyToId ? `↩️ Respuesta a #${evidence.replyToId}` : "📝 Publicación Original"}`,
          inline: false,
        },
        {
          name: "💬 Contenido",
          value: `>>> ${evidence.content}`,
        },
      )
      .setFooter({ text: `Solo para ojos autorizados~ 🐾 • ID: ${evidence._id}` })
      .setTimestamp();

    if (evidence.imageUrl) {
      auditEmbed.setImage(evidence.imageUrl);
      auditEmbed.addFields({
        name: "🖼️ Imagen Adjunta",
        value: `[🔗 Ver imagen](${evidence.imageUrl})`,
      });
    }

    await interaction.editReply({ embeds: [auditEmbed] });
  },
};
export default command;
