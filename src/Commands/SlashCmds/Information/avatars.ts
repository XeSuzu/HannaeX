import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { AvatarHistoryManager } from "../../../Database/AvatarHistoryManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const buildAvatarEmbed = (
  target: User,
  member: any,
  requester: string,
  savedAvatars: any[],
) => {
  const isAnimated = target.avatar?.startsWith("a_");
  const avatarURL = target.displayAvatarURL({
    size: 1024,
    extension: isAnimated ? "gif" : "png",
  });
  const bannerURL = target.bannerURL({ size: 1024 });
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
    ? `Se muestran hasta 5 avatares guardados de ${savedCount}.`
    : "No hay avatares guardados para este servidor. Es posible que el usuario sea reciente o que todavía no haya cambiado de avatar desde que el bot llegó.";

  const embed = new EmbedBuilder()
    .setTitle(`✨ Avatares de ${target.username}`)
    .setColor(member?.displayHexColor || 0xffb6c1)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setImage(avatarURL)
    .setDescription(
      `📌 **Avatar actual** del usuario y el historial guardado en este servidor.`,
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
      {
        name: `📚 Historial de avatares (${savedCount})`,
        value: savedSummary,
        inline: false,
      },
    )
    .setFooter({ text: `Solicitado por ${requester}` })
    .setTimestamp();

  return embed;
};

const buildAvatarButtons = (target: User) => {
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

const buildSavedAvatarEmbeds = (savedAvatars: any[]) => {
  return savedAvatars.slice(0, 5).map((record, index) =>
    new EmbedBuilder()
      .setTitle(`Avatar guardado #${index + 1}`)
      .setColor(0xffb6c1)
      .setDescription(
        `Guardado <t:${Math.floor(new Date(record.createdAt).getTime() / 1000)}:R>`,
      )
      .setImage(record.url)
      .setFooter({ text: `Historial de avatares` })
      .setTimestamp(new Date(record.createdAt)),
  );
};

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

    try {
      const target = interaction.options.getUser("usuario") ?? interaction.user;
      await target.fetch(true);
      const member = await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);
      const savedAvatars = await AvatarHistoryManager.getAvatars(
        target.id,
        interaction.guild.id,
      );

      const embed = buildAvatarEmbed(
        target,
        member,
        interaction.user.tag,
        savedAvatars,
      );
      const historyEmbeds = buildSavedAvatarEmbeds(savedAvatars);
      const components = buildAvatarButtons(target);

      await interaction.editReply({
        embeds: [embed, ...historyEmbeds],
        components,
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

    await target.fetch(true);
    const member = await message.guild.members
      .fetch(target.id)
      .catch(() => null);
    const savedAvatars = await AvatarHistoryManager.getAvatars(
      target.id,
      message.guild.id,
    );
    const embed = buildAvatarEmbed(
      target,
      member,
      message.author.tag,
      savedAvatars,
    );
    const historyEmbeds = buildSavedAvatarEmbeds(savedAvatars);
    const components = buildAvatarButtons(target);

    await message.reply({ embeds: [embed, ...historyEmbeds], components });
  },
};

export default command;
