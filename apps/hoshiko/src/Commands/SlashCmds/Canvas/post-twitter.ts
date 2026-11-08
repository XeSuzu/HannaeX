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
import { generateTwitterPost } from "./twitterRenderer";

const command: SlashCommand = {
  category: "Canvas",
  options: { ephemeral: true },
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("🐦 Crea un tweet (X) con diseño limpio y sin errores.")
    .addStringOption((o) =>
      o
        .setName("texto")
        .setDescription("¿Qué estás pensando?")
        .setRequired(true),
    )
    .addAttachmentOption((o) =>
      o
        .setName("imagen")
        .setDescription("Foto para el tweet")
        .setRequired(false),
    )
    .addUserOption((o) =>
      o.setName("usuario").setDescription("¿Quién publica?").setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
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
    const displayName =
      member?.displayName || (user as any).globalName || user.username;
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
    const attachmentUrl = attachment ? attachment.url : null;

    const buffer = await generateTwitterPost({
      text,
      displayName,
      username: user.username,
      avatarUrl,
      badgeColor,
      attachmentUrl,
    });

    const file = new AttachmentBuilder(buffer, { name: "tweet.png" });

    if (interaction.channel?.isTextBased()) {
      await (interaction.channel as TextChannel).send({
        content: `🐦 Tweet de **${user.username}**`,
        files: [file],
      });
    }

    await interaction.editReply({ content: "✅ **Tweet publicado!** 🐦" });
  },
};

export default command;
