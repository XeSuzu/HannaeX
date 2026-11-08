import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Message,
  User,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { resolveInteractionTarget } from "../../../Utils/animeGif";

async function buildAvatarPayload(
  target: User,
  guild: ChatInputCommandInteraction["guild"],
  requesterTag: string,
  preferBanner = false,
) {
  await target.fetch(true).catch(() => null);
  const member = await guild?.members.fetch(target.id).catch(() => null);

  const avatarURL =
    member?.displayAvatarURL({ size: 1024 }) ||
    target.displayAvatarURL({ size: 1024 }) ||
    "https://i.imgur.com/O3DHIA5.png";

  const bannerURL = target.bannerURL({ size: 1024 }) ?? undefined;

  const formats = ["png", "jpg", "webp"] as const;
  const buttons = formats.map((fmt) =>
    new ButtonBuilder()
      .setLabel(fmt.toUpperCase())
      .setStyle(ButtonStyle.Link)
      .setURL(target.displayAvatarURL({ size: 1024, extension: fmt })),
  );

  if (target.avatar?.startsWith("a_")) {
    buttons.unshift(
      new ButtonBuilder()
        .setLabel("GIF")
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 1024, extension: "gif" })),
    );
  }

  if (bannerURL) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Banner")
        .setStyle(ButtonStyle.Link)
        .setURL(bannerURL),
    );
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  const color = member?.roles.highest?.color || 0xffb6c1;
  const statusMap: Record<string, string> = {
    online: "🟢 Online",
    idle: "🌙 Ausente",
    dnd: "⛔ No molestar",
    offline: "⚫ Offline",
  };
  const status = member?.presence?.status
    ? statusMap[member.presence.status]
    : "⚪ Desconocido";

  const embed = new EmbedBuilder()
    .setTitle(
      preferBanner && bannerURL
        ? `🎨 Banner de ${target.username}`
        : `✨ Avatar de ${target.username}`,
    )
    .setColor(color)
    .setFooter({ text: `Solicitado por: ${requesterTag}` })
    .setTimestamp()
    .addFields(
      { name: "ID", value: `\`${target.id}\``, inline: true },
      {
        name: "Cuenta creada",
        value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      { name: "Estado", value: status, inline: true },
      {
        name: "Nitro Boost",
        value: member?.premiumSince ? "💎 Sí" : "❌ No",
        inline: true,
      },
    )
    .setImage(preferBanner && bannerURL ? bannerURL : avatarURL);

  if (preferBanner && bannerURL) {
    embed.setThumbnail(avatarURL);
  }

  if (member?.joinedTimestamp) {
    embed.addFields({
      name: "En el servidor desde",
      value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
      inline: true,
    });
  }

  return { embeds: [embed], components: [row] };
}

const command: SlashCommand = {
  category: "Profiles",
  aliases: ["av", "pfp", "foto", "banner"],
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("🖼 Muestra el avatar y banner de un usuario con estilo.")
    .addUserOption((o) =>
      o.setName("usuario").setDescription("👤 Usuario al que deseas ver el avatar"),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    const target: User = interaction.options.getUser("usuario") ?? interaction.user;
    const payload = await buildAvatarPayload(
      target,
      interaction.guild,
      interaction.user.tag,
    );
    await interaction.editReply(payload);
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const resolved = await resolveInteractionTarget(message, args);
    const target: User = resolved ?? message.author;
    const preferBanner = /\bbanner\b/i.test(message.content.split(/\s+/)[1] || "") ||
      /\bbanner\b/i.test(message.content.split(/\s+/)[0] || "");
    const payload = await buildAvatarPayload(
      target,
      message.guild,
      message.author.tag,
      preferBanner,
    );
    await message.reply(payload);
  },
};
export default command;
