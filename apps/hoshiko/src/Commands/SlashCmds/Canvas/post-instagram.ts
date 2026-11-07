import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { generateInstaPost } from "./instaRenderer";

const command: SlashCommand = {
  category: "Canvas",
  options: { ephemeral: true }, // Asegúrate de que el defer centralizado lea esto
  data: new SlashCommandBuilder()
    .setName("post")
    .setDescription("Genera posts de redes sociales.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("instagram")
        .setDescription("📸 Crea un post de Instagram con diseño perfecto.")
        .addStringOption((option) =>
          option
            .setName("texto")
            .setDescription("Pie de foto o texto del estado.")
            .setRequired(true),
        )
        .addAttachmentOption((option) =>
          option
            .setName("imagen")
            .setDescription("Foto para el post (Opcional).")
            .setRequired(false),
        )
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("¿Quién publica esto?")
            .setRequired(false),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    if (interaction.options.getSubcommand() !== "instagram") return;

    let text = interaction.options.getString("texto", true);
    const attachment = interaction.options.getAttachment("imagen");
    const user = interaction.options.getUser("usuario") || interaction.user;

    // Obtener color del badge
    let badgeColor: string | null = null;
    const member = interaction.guild?.members.cache.get(user.id);
    if (user.id === process.env.BOT_OWNER_ID) badgeColor = "#D4AF37";
    else if (user.id === interaction.guild?.ownerId) badgeColor = "#C0392B";
    else if (member?.premiumSince) badgeColor = "#9B59B6";
    else if (user.id === client.user?.id) badgeColor = "#2980B9";

    // Limpiar menciones para que se lean bien en la imagen
    text = text
      .replace(/<@!?(\d+)>/g, (m, id) => {
        const mem = interaction.guild?.members.cache.get(id);
        return mem ? `@${mem.displayName}` : m;
      })
      .replace(/<@&(\d+)>/g, "@Rol")
      .replace(/<#(\d+)>/g, "#Canal");

    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
    const attachmentUrl = attachment ? attachment.url : null;

    // 🎨 Llamamos al motor gráfico (aislado de Discord)
    const imageBuffer = await generateInstaPost(
      text,
      user.username,
      avatarUrl,
      badgeColor,
      attachmentUrl,
    );

    const file = new AttachmentBuilder(imageBuffer, { name: "insta-post.png" });

    if (interaction.channel && interaction.channel.isTextBased()) {
      await (interaction.channel as TextChannel).send({
        content: `📸 Post de **${user.username}**`,
        files: [file],
      });
    }

    await interaction.editReply({
      content: "✅ **Post publicado en el canal!** 📸",
    });
  },
};

export default command;
