import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import {
  formatSocialMentions,
  isSupportedImageAttachment,
  resolveBadgeColor,
} from "./canvasPrimitives";
import { generateInstaPost } from "./instaRenderer";
import { generateTwitterPost } from "./twitterRenderer";

const command: SlashCommand = {
  category: "Canvas",
  options: { ephemeral: true },
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("twitter")
        .setDescription("🐦 Crea un tweet (X) con diseño limpio y sin errores.")
        .addStringOption((option) =>
          option
            .setName("texto")
            .setDescription("¿Qué estás pensando?")
            .setRequired(true),
        )
        .addAttachmentOption((option) =>
          option
            .setName("imagen")
            .setDescription("Foto para el tweet (Opcional).")
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
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== "instagram" && subcommand !== "twitter") return;

    const rawText = interaction.options.getString("texto", true);
    const attachment = interaction.options.getAttachment("imagen");
    const user = interaction.options.getUser("usuario") || interaction.user;

    if (attachment && !isSupportedImageAttachment(attachment)) {
      await interaction.editReply({
        content:
          "⚠️ El archivo adjunto debe ser una imagen válida (`PNG`, `JPG` o `WEBP`).",
      });
      return;
    }

    const member =
      interaction.guild?.members?.cache?.get(user.id) ||
      (await interaction.guild?.members?.fetch(user.id).catch(() => null));

    const badgeColor = resolveBadgeColor(
      user,
      interaction.guild,
      client.user?.id,
      member?.premiumSince,
    );

    const text = formatSocialMentions(rawText, interaction.guild);
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
    const attachmentUrl = attachment ? attachment.url : null;

    if (subcommand === "twitter") {
      const displayName =
        member?.displayName || (user as any).globalName || user.username;
      const tweetBuffer = await generateTwitterPost({
        text,
        displayName,
        username: user.username,
        avatarUrl,
        badgeColor,
        attachmentUrl,
      });

      const file = new AttachmentBuilder(tweetBuffer, { name: "tweet.png" });
      if (interaction.channel && interaction.channel.isTextBased()) {
        await (interaction.channel as TextChannel).send({
          content: `🐦 Tweet de **${user.username}**`,
          files: [file],
        });
      }

      await interaction.editReply({
        content: "✅ **Tweet publicado en el canal!** 🐦",
      });
      return;
    }

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
