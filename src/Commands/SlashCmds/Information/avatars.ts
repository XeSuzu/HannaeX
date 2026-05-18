import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
  User,
  GuildMember,
} from "discord.js";
import { AvatarHistoryManager } from "../../../Database/AvatarHistoryManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

// ─── Helper: guarda snapshot de avatares del usuario ─────────────────────────
// Guarda el avatar global Y el avatar de servidor (Nitro) si son distintos
const snapshotAvatars = async (
  target: User,
  member: GuildMember | null,
  guildId: string,
  guildName: string,
) => {
  // Avatar global
  const globalAvatar = target.displayAvatarURL({ size: 256, extension: "png" });
  await AvatarHistoryManager.addAvatar(target.id, globalAvatar, {
    guildId,
    guildName,
    source: "command",
  });

  // Avatar de servidor (Nitro) — solo si es distinto al global
  const serverAvatar = member?.avatarURL({ size: 256, extension: "png" });
  if (serverAvatar && serverAvatar !== globalAvatar) {
    await AvatarHistoryManager.addAvatar(target.id, serverAvatar, {
      guildId,
      guildName,
      source: "guild",
    });
  }
};

// ─── Embed principal ──────────────────────────────────────────────────────────
const buildAvatarEmbed = (
  target: User,
  member: GuildMember | null,
  requester: string,
  savedAvatars: any[],
) => {
  const isAnimated = target.avatar?.startsWith("a_");
  const avatarURL = target.displayAvatarURL({
    size: 1024,
    extension: isAnimated ? "gif" : "png",
  });
  const bannerURL = target.bannerURL({ size: 1024 });

  // Avatar de servidor (Nitro) si existe
  const serverAvatarURL = member?.avatarURL({ size: 1024 }) ?? null;
  const isServerAvatarAnimated = member?.avatar?.startsWith("a_");

  const statusMap: Record<string, string> = {
    online: "🟢 En línea",
    idle: "🌙 Ausente",
    dnd: "⛔ No molestar",
    offline: "⚫ Offline",
  };
  const status = member?.presence?.status
    ? (statusMap[member.presence.status] ?? "⚪ Desconocido")
    : "⚪ Desconocido";

  const savedCount = savedAvatars.length;
  const savedSummary = savedCount
    ? `Se muestran hasta 15 avatares guardados de ${savedCount}.`
    : "No hay avatares guardados para este servidor. Es posible que el usuario sea reciente o que todavía no haya cambiado de avatar desde que el bot llegó.";

  const savedAvatarFields = savedAvatars.slice(0, 15).map((record, index) => ({
    name: `#${index + 1}`,
    value: `Guardado <t:${Math.floor(new Date(record.createdAt).getTime() / 1000)}:R>`,
    inline: true,
  }));

  const mainImage = savedAvatars.length
    ? "attachment://saved-avatars-grid.png"
    : avatarURL;

  return new EmbedBuilder()
    .setTitle(`✨ Avatares de ${target.username}`)
    .setColor(member?.displayHexColor || 0xffb6c1)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setImage(mainImage)
    .setDescription(
      `📌 **Avatar actual** en la miniatura y hasta 15 avatares guardados mostrados en una sola imagen adjunta si hay historial.`,
    )
    .addFields(
      { name: "👤 Usuario", value: `${target.tag}`, inline: true },
      { name: "🆔 ID", value: `\`${target.id}\``, inline: true },
      {
        name: "📅 Cuenta creada",
        value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      { name: "🔧 Estado", value: status, inline: true },
      {
        name: "🎨 Avatar animado",
        value: isAnimated ? "✅ Sí (GIF)" : "❌ No",
        inline: true,
      },
      {
        name: "🖼️ Banner disponible",
        value: bannerURL ? "✅ Sí" : "❌ No",
        inline: true,
      },
      // Nitro: mostrar si tiene avatar de servidor distinto
      {
        name: "🌟 Avatar de servidor (Nitro)",
        value: serverAvatarURL
          ? `[Ver](${member?.avatarURL({ size: 1024, extension: isServerAvatarAnimated ? "gif" : "png" })}) ${isServerAvatarAnimated ? "✅ GIF" : ""}`
          : "*(usa el global)*",
        inline: true,
      },
      {
        name: `📚 Historial de avatares (${savedCount})`,
        value: savedSummary,
        inline: false,
      },
      ...savedAvatarFields,
    )
    .setFooter({ text: `Solicitado por ${requester}` })
    .setTimestamp();
};

// ─── Botones de descarga ──────────────────────────────────────────────────────
const buildAvatarButtons = (target: User, member: GuildMember | null) => {
  const formats = ["png", "jpg", "webp"] as const;
  const buttons = new ActionRowBuilder<ButtonBuilder>();

  if (target.avatar?.startsWith("a_")) {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel("GIF")
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 1024, extension: "gif" })),
    );
  }

  formats.forEach((fmt) => {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel(fmt.toUpperCase())
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 1024, extension: fmt })),
    );
  });

  // Botón extra para avatar de servidor (Nitro) si existe
  const serverAvatarURL = member?.avatarURL({ size: 1024 });
  if (serverAvatarURL) {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel("Avatar servidor")
        .setStyle(ButtonStyle.Link)
        .setURL(serverAvatarURL),
    );
  }

  const bannerURL = target.bannerURL({ size: 1024 });
  if (bannerURL) {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel("Banner")
        .setStyle(ButtonStyle.Link)
        .setURL(bannerURL),
    );
  }

  return [buttons];
};

// ─── Grid de avatares guardados ───────────────────────────────────────────────
const buildAvatarGridAttachment = async (
  savedAvatars: any[],
): Promise<AttachmentBuilder | null> => {
  if (!savedAvatars.length) return null;

  const avatars = savedAvatars.slice(0, 15);
  const columns = 5;
  const size = 96;
  const padding = 6;
  const rows = Math.ceil(avatars.length / columns);
  const width = columns * size + padding * (columns + 1);
  const height = rows * size + padding * (rows + 1);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2f3136";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < avatars.length; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const x = padding + column * (size + padding);
    const y = padding + row * (size + padding);
    try {
      const response = await fetch(avatars[i].url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const image = await loadImage(buffer);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 12);
      ctx.clip();
      ctx.drawImage(image, x, y, size, size);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
    } catch {
      ctx.fillStyle = "#202225";
      ctx.fillRect(x, y, size, size);
    }
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "saved-avatars-grid.png",
  });
};

// ─── Resolver usuario desde args (prefix) ────────────────────────────────────
const resolveUserFromArgs = async (
  message: Message,
  args: string[],
): Promise<User | null> => {
  if (message.mentions.users.first()) {
    return message.mentions.users.first() as User;
  }
  if (args[0]) {
    try {
      return await message.client.users.fetch(args[0]);
    } catch {
      return null;
    }
  }
  return message.author;
};

// ─── Comando ──────────────────────────────────────────────────────────────────
const command: SlashCommand = {
  category: "Profiles",
  data: new SlashCommandBuilder()
    .setName("avatars")
    .setDescription(
      "📸 Ve el avatar actual de un usuario en todos los formatos disponibles.",
    )
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Selecciona al usuario cuyo avatar deseas ver")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando solo puede usarse en un servidor.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const target = interaction.options.getUser("usuario") ?? interaction.user;
      // force:true para obtener banner global y datos completos
      await target.fetch(true);

      const member = await interaction.guild.members
        .fetch({ user: target.id, force: true })
        .catch(() => null);

      // ── GUARDAR snapshot de avatares (global + servidor si Nitro) ──────────
      await snapshotAvatars(
        target,
        member,
        interaction.guild.id,
        interaction.guild.name,
      );

      const savedAvatars = await AvatarHistoryManager.getAvatars(
        target.id,
        interaction.guild.id,
      );

      const attachment = await buildAvatarGridAttachment(savedAvatars);
      const embed = buildAvatarEmbed(
        target,
        member,
        interaction.user.tag,
        savedAvatars,
      );
      const components = buildAvatarButtons(target, member);

      await interaction.editReply({
        embeds: [embed],
        components,
        files: attachment ? [attachment] : [],
      });
    } catch (error) {
      console.error("Error en /avatars:", error);
      await interaction.editReply({
        content: "❌ Ocurrió un error al mostrar el avatar.",
        embeds: [],
        components: [],
      });
    }
  },

  prefixRun: async (
    client: HoshikoClient,
    message: Message,
    args: string[],
  ) => {
    if (!message.guild) return;

    const target = await resolveUserFromArgs(message, args);
    if (!target) {
      await message.reply(
        "❌ Usuario no encontrado. Menciona a alguien o usa su ID.",
      );
      return;
    }

    // force:true para datos completos
    await target.fetch(true).catch(() => null);

    const member = await message.guild.members
      .fetch({ user: target.id, force: true })
      .catch(() => null);

    // ── GUARDAR snapshot de avatares (global + servidor si Nitro) ────────────
    await snapshotAvatars(target, member, message.guild.id, message.guild.name);

    const savedAvatars = await AvatarHistoryManager.getAvatars(
      target.id,
      message.guild.id,
    );

    const attachment = await buildAvatarGridAttachment(savedAvatars);
    const embed = buildAvatarEmbed(
      target,
      member,
      message.author.tag,
      savedAvatars,
    );
    const components = buildAvatarButtons(target, member);

    await message.reply({
      embeds: [embed],
      components,
      files: attachment ? [attachment] : [],
    });
  },
};

export default command;
