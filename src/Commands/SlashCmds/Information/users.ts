import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { UserHistoryManager } from "../../../Database/UserHistoryManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

// ─── Helper: guarda snapshot del usuario en el servidor actual ────────────────
// Captura tanto datos globales como datos de servidor (Nitro: avatar/banner/nick)
const snapshotUser = async (
  target: User,
  member: GuildMember | null,
  guildId: string,
  guildName: string,
) => {
  // Avatar de servidor (Nitro) tiene prioridad; si no, avatar global
  const avatarUrl =
    member?.avatarURL({ size: 256, extension: "png" }) ??
    target.displayAvatarURL({ size: 256, extension: "png" });

  // Banner de servidor (Nitro) si existe, si no el global
  const bannerUrl =
    (member as any)?.bannerURL?.({ size: 1024 }) ??
    target.bannerURL({ size: 1024 }) ??
    undefined;

  // displayName: apodo en servidor > nombre global de display > username
  const displayName = member?.nickname ?? target.globalName ?? target.username;

  await UserHistoryManager.addUser(target.id, {
    // Campos estándar
    username: target.username,
    discriminator: target.discriminator,
    tag: target.tag,
    displayName,
    avatarUrl,
    bannerUrl,
    // Contexto del servidor
    guildId,
    guildName,
    source: "command",
  });
};

// ─── Embed: lista de usuarios del servidor ────────────────────────────────────
const buildUsersEmbed = (guild: any) => {
  const members = guild.members.cache;
  const total = guild.memberCount ?? members.size;
  const bots = members.filter((m: any) => m.user.bot).size;
  const humans = total - bots;
  const online = members.filter(
    (m: any) => m.presence && m.presence.status !== "offline",
  ).size;
  const offline = total - online;

  const sampleMembers = members
    .filter((m: any) => !m.user.bot)
    .sort((a: any, b: any) => a.user.username.localeCompare(b.user.username))
    .first(20)
    .map((m: any) => `${m.user.username}`);

  const sampleText = sampleMembers.length
    ? sampleMembers.join("\n") +
      (total > sampleMembers.length
        ? `\n...y ${total - sampleMembers.length} más`
        : "")
    : "No hay miembros en caché para mostrar.";

  return new EmbedBuilder()
    .setTitle(`👥 Usuarios de ${guild.name}`)
    .setColor(guild.members.me?.displayHexColor || 0x5865f2)
    .setThumbnail(guild.iconURL({ size: 256 }) || undefined)
    .setDescription(
      `📋 Listado rápido de usuarios del servidor con estadísticas de miembros.`,
    )
    .addFields(
      {
        name: "┌─ 📊 Estadísticas generales",
        value: [
          `│ **Total:** ${total}`,
          `│ **Humanos:** ${humans}`,
          `│ **Bots:** ${bots}`,
          `│ **Con presencia visible:** ${online}`,
          `└─ **Sin presencia:** ${offline}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: `┌─ 📝 Miembros en caché (${sampleMembers.length})`,
        value: `│ ${sampleText.replace(/\n/g, "\n│ ")}`,
        inline: false,
      },
    )
    .setFooter({ text: `Solicitado por ${guild.client.user?.username}` })
    .setTimestamp();
};

// ─── Embed: historial de un usuario ──────────────────────────────────────────
const buildUserHistoryEmbed = (
  target: User,
  member: GuildMember | null,
  history: any[],
  requester: string,
) => {
  const isAnimated = target.avatar?.startsWith("a_");

  // Mostrar avatar de servidor (Nitro) si existe, si no el global
  const displayAvatarURL =
    member?.avatarURL({ size: 1024, extension: isAnimated ? "gif" : "png" }) ??
    target.displayAvatarURL({
      size: 1024,
      extension: isAnimated ? "gif" : "png",
    });

  // Banner: servidor primero, luego global
  const bannerURL =
    (member as any)?.bannerURL?.({ size: 1024 }) ??
    target.bannerURL({ size: 1024 });

  // Nombre a mostrar: apodo > nombre global > username
  const displayName = member?.nickname ?? target.globalName ?? target.username;

  const historyLines = history.slice(0, 5).map((record, index) => {
    const guildLabel = record.guildName
      ? `Servidor: ${record.guildName}`
      : "Global";
    return `**${index + 1}.** ${record.displayName || record.tag}\n${guildLabel} • <t:${Math.floor(
      new Date(record.createdAt).getTime() / 1000,
    )}:R>`;
  });

  return new EmbedBuilder()
    .setTitle(`👤 Historial de ${displayName}`)
    .setColor(member?.displayHexColor || 0x5865f2)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setDescription(
      `📚 Este historial muestra los datos del usuario que el bot ha podido recolectar mientras compartían este servidor.`,
    )
    .addFields(
      { name: "Tag actual", value: `${target.tag}`, inline: true },
      {
        name: "Apodo en servidor",
        value: member?.nickname ?? "*(sin apodo)*",
        inline: true,
      },
      {
        name: "Registros guardados",
        value: `${history.length}`,
        inline: true,
      },
      {
        name: "Última actualización",
        value: history.length
          ? `<t:${Math.floor(new Date(history[0].createdAt).getTime() / 1000)}:R>`
          : "No hay registros",
        inline: true,
      },
      {
        name: "Historial reciente",
        value: historyLines.length
          ? historyLines.join("\n\n")
          : "No se encontraron registros para este usuario.",
        inline: false,
      },
      {
        name: "Avatar actual",
        value: displayAvatarURL
          ? `[Ver avatar](${displayAvatarURL})`
          : "No disponible",
        inline: true,
      },
      {
        name: "Avatar de servidor",
        value: member?.avatarURL()
          ? `[Ver avatar de servidor](${member.avatarURL({ size: 1024 })})`
          : "*(usa el global)*",
        inline: true,
      },
      {
        name: "Banner disponible",
        value: bannerURL ? `✅ [Ver banner](${bannerURL})` : "❌ No",
        inline: true,
      },
    )
    .setFooter({ text: `Solicitado por ${requester}` })
    .setTimestamp();
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
    .setName("users")
    .setDescription(
      "👥 Muestra estadísticas del servidor o historial guardado de un usuario.",
    )
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Selecciona un usuario para ver su historial.")
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
      // Forzar fetch para obtener banner global (requiere fetch con force:true)
      await target.fetch(true);

      const member = await interaction.guild.members
        .fetch({ user: target.id, force: true })
        .catch(() => null);

      // ── GUARDAR snapshot del estado actual ────────────────────────────────
      await snapshotUser(
        target,
        member,
        interaction.guild.id,
        interaction.guild.name,
      );

      const history = await UserHistoryManager.getHistory(
        target.id,
        interaction.guild.id,
      );

      const embed = buildUserHistoryEmbed(
        target,
        member,
        history,
        interaction.user.tag,
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error en /users:", error);
      await interaction.editReply({
        content: "❌ Ocurrió un error al mostrar la información de usuarios.",
        embeds: [],
      });
    }
  },

  prefixRun: async (
    client: HoshikoClient,
    message: Message,
    args: string[],
  ) => {
    if (!message.guild) return;

    try {
      const target = await resolveUserFromArgs(message, args);

      if (args.length > 0 && !target) {
        await message.reply(
          "❌ Usuario no encontrado. Menciona a alguien o usa su ID válida.",
        );
        return;
      }

      if (target) {
        // Forzar fetch para datos completos (banner global, etc.)
        await target.fetch(true).catch(() => null);

        const member = await message.guild.members
          .fetch({ user: target.id, force: true })
          .catch(() => null);

        // ── GUARDAR snapshot del estado actual ──────────────────────────────
        await snapshotUser(
          target,
          member,
          message.guild.id,
          message.guild.name,
        );

        const history = await UserHistoryManager.getHistory(
          target.id,
          message.guild.id,
        );

        const embed = buildUserHistoryEmbed(
          target,
          member,
          history,
          message.author.tag,
        );

        await message.reply({ embeds: [embed] });
        return;
      }

      // Sin args → mostrar lista del servidor
      const embed = buildUsersEmbed(message.guild);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error en prefix users:", error);
      await message.reply(
        "❌ Ocurrió un error al mostrar la información de usuarios.",
      );
    }
  },
};

export default command;
