import {
  Activity,
  ActivityType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  Presence,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { PresenceHistoryManager } from "../../../Database/PresenceHistoryManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { IPresenceHistory } from "../../../Models/PresenceHistory";
import {
  renderSpotifyCard,
  SpotifyCardData,
} from "../../../Renderers/spotifyRenderer";

type PartialPresenceLike = Pick<Presence, "status" | "activities">;

const STATUS_LABELS: Record<string, string> = {
  online: "🟢 En línea",
  idle: "🟡 Ausente",
  dnd: "🔴 No molestar",
  offline: "⚫ Desconectado",
};

const ACTIVITY_ICONS: Partial<Record<ActivityType, string>> = {
  [ActivityType.Playing]: "🎮",
  [ActivityType.Streaming]: "📡",
  [ActivityType.Listening]: "🎵",
  [ActivityType.Watching]: "📺",
  [ActivityType.Competing]: "🏆",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveUserFromArgs = async (
  message: Message,
  args: string[],
): Promise<User | null> => {
  if (message.mentions.users.first()) {
    return message.mentions.users.first()!;
  }
  if (args[0]) {
    return message.client.users.fetch(args[0]).catch(() => null);
  }
  return null;
};

async function resolvePresence(
  guild: Guild,
  userId: string,
): Promise<PartialPresenceLike | null> {
  const cached = guild.members.cache.get(userId) ?? null;
  const member =
    cached ?? (await guild.members.fetch(userId).catch(() => null));

  if (cached?.presence) return cached.presence;
  if (member?.presence) return member.presence;

  const persisted: IPresenceHistory | null =
    await PresenceHistoryManager.getPresence(userId, guild.id);

  if (!persisted) return null;

  return {
    status: persisted.status,
    activities: persisted.activities.map((a) => ({
      type: a.type as ActivityType,
      name: a.name,
      details: a.details,
      state: a.state,
      url: a.url,
      timestamps: a.timestamps,
      assets: a.assets,
      emoji: a.emoji ? { name: a.emoji } : undefined,
    })),
  } as unknown as PartialPresenceLike;
}

function formatTimestamp(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

function getSpotifyCover(activity: Activity): string | null {
  if (
    activity.type === ActivityType.Listening &&
    activity.name === "Spotify" &&
    activity.assets?.largeImage
  ) {
    const imageId = String(activity.assets.largeImage).replace(/^spotify:/, "");
    return `https://i.scdn.co/image/${imageId}`;
  }
  return null;
}

function getSpotifyActivity(
  presence: PartialPresenceLike | null,
): Activity | null {
  if (!presence?.activities?.length) return null;
  return (
    (presence.activities as Activity[]).find(
      (a) => a.type === ActivityType.Listening && a.name === "Spotify",
    ) ?? null
  );
}

function formatActivity(activity: Activity): string {
  if (activity.type === ActivityType.Listening && activity.name === "Spotify") {
    const track = activity.details || "Canción desconocida";
    const artist = activity.state || "Artista desconocido";
    const album = activity.assets?.largeText
      ? `\n   ├─ Álbum: ${activity.assets.largeText}`
      : "";
    const start = formatTimestamp(activity.timestamps?.start?.getTime());
    const end = formatTimestamp(activity.timestamps?.end?.getTime());
    const startText = start ? `\n   ├─ Inició ${start}` : "";
    const endText = end ? `\n   └─ Termina ${end}` : "";
    return `🎧 **Spotify**\n   ├─ ${track}\n   ├─ ${artist}${album}${startText}${endText}`.trim();
  }

  const icon = ACTIVITY_ICONS[activity.type as ActivityType] ?? "📌";
  const title = activity.name
    ? `**${activity.name}**`
    : "**Actividad desconocida**";
  const details = activity.details ? `\n   ├─ ${activity.details}` : "";
  const state = activity.state ? `\n   ├─ ${activity.state}` : "";
  const url = activity.url ? `\n   ├─ <${activity.url}>` : "";
  const start = formatTimestamp(activity.timestamps?.start?.getTime());
  const end = formatTimestamp(activity.timestamps?.end?.getTime());
  const startText = start ? `\n   ├─ Inició ${start}` : "";
  const endText = end ? `\n   └─ Termina ${end}` : "";
  const largeText = activity.assets?.largeText
    ? `\n   ├─ ${activity.assets.largeText}`
    : "";
  const smallText = activity.assets?.smallText
    ? `\n   └─ ${activity.assets.smallText}`
    : "";

  return `${icon} ${title}${details}${state}${url}${startText}${endText}${largeText}${smallText}`.trim();
}

function getActivities(presence: PartialPresenceLike | null): {
  text: string | null;
  total: number;
  image?: string | null;
  color?: number | null;
} {
  if (!presence?.activities?.length)
    return { text: null, total: 0, image: null, color: null };

  const visibleActivities = (presence.activities as Activity[]).filter(
    (activity) => activity.type !== ActivityType.Custom,
  );

  if (!visibleActivities.length)
    return { text: null, total: 0, image: null, color: null };

  const displayed = visibleActivities.slice(0, 3);
  const text = displayed.map(formatActivity).join("\n\n");
  const spotifyImage = visibleActivities
    .map(getSpotifyCover)
    .find((url) => url) as string | null;
  const color = visibleActivities.some(
    (a) => a.type === ActivityType.Listening && a.name === "Spotify",
  )
    ? 0x1db954
    : null;

  return { text, total: visibleActivities.length, image: spotifyImage, color };
}

function getCustomStatus(presence: PartialPresenceLike | null): string | null {
  if (!presence?.activities?.length) return null;
  const custom = (presence.activities as Activity[]).find(
    (a) => a.type === ActivityType.Custom,
  );
  if (!custom) return null;
  const emoji = custom.emoji ? `${custom.emoji} ` : "";
  return `${emoji}${custom.state ?? ""}`.trim() || null;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

const buildActivityEmbed = (
  target: User,
  member: GuildMember | null,
  presence: PartialPresenceLike | null,
  requester: string,
): EmbedBuilder => {
  const status = presence?.status ?? null;
  const activityData = getActivities(presence);
  const customStatus = getCustomStatus(presence);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Actividad actual de ${target.username}`)
    .setColor(activityData.color ?? member?.displayHexColor ?? 0x5865f2)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setDescription(
      "Aquí se muestra la actividad que Discord expone en tiempo real para este usuario. Incluye juegos, streaming, reproducción de música, estado personalizado y detalles de sesión cuando están disponibles.",
    )
    .addFields(
      {
        name: "┌─ 📌 Estado",
        value: status
          ? `│ **${STATUS_LABELS[status] || status}**\n└─`
          : "Este usuario no tiene presencia disponible o no está en caché.",
        inline: false,
      },
      {
        name: "┌─ 🕹️ Actividad actual",
        value: activityData.text
          ? `│\n${activityData.text.replace(/\n/g, "\n│ ")}\n${activityData.total > 3 ? `│\n└─ Y ${activityData.total - 3} actividad(es) más no se muestran` : "└─"}`
          : "Este usuario no tiene actividad visible en este momento.",
        inline: false,
      },
    )
    .setFooter({ text: `Solicitado por ${requester}` })
    .setTimestamp();

  if (activityData.image) embed.setImage(activityData.image);

  if (customStatus) {
    embed.addFields({
      name: "┌─ ✨ Estado personalizado",
      value: `│ ${customStatus}\n└─`,
      inline: false,
    });
  }

  return embed;
};

async function buildActivityReply(
  target: User,
  member: GuildMember | null,
  presence: PartialPresenceLike | null,
  requester: string,
): Promise<{ embeds: EmbedBuilder[]; files: AttachmentBuilder[] }> {
  const spotifyActivity = getSpotifyActivity(presence);

  if (spotifyActivity) {
    const coverUrl = getSpotifyCover(spotifyActivity) ?? null;

    const cardData: SpotifyCardData = {
      track: spotifyActivity.details ?? "Canción desconocida",
      artist: spotifyActivity.state ?? "Artista desconocido",
      album: spotifyActivity.assets?.largeText ?? undefined,
      coverUrl,
      progressMs: spotifyActivity.timestamps?.start
        ? Date.now() - spotifyActivity.timestamps.start.getTime()
        : 0,
      durationMs:
        spotifyActivity.timestamps?.start && spotifyActivity.timestamps?.end
          ? spotifyActivity.timestamps.end.getTime() -
            spotifyActivity.timestamps.start.getTime()
          : 0,
      username: target.username,
      avatarUrl: target.displayAvatarURL({ size: 64, extension: "png" }),
    };

    const buffer = await renderSpotifyCard(cardData);
    const attachment = new AttachmentBuilder(buffer, { name: "activity.png" });

    const embed = new EmbedBuilder()
      .setColor(0x0e0e10)
      .setImage("attachment://activity.png")
      .setFooter({ text: `Solicitado por ${requester}` })
      .setTimestamp();

    return { embeds: [embed], files: [attachment] };
  }

  // fallback embed de texto para actividades no-Spotify
  const embed = buildActivityEmbed(target, member, presence, requester);
  return { embeds: [embed], files: [] };
}

// ─── Comando ──────────────────────────────────────────────────────────────────

const command: SlashCommand = {
  category: "Profiles",
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Muestra la actividad actual de un usuario en Discord.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario del que deseas ver la actividad")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    if (!interaction.guild) {
      await interaction.editReply({
        content: "❌ Este comando solo puede usarse dentro de un servidor.",
      });
      return;
    }

    try {
      const target = interaction.options.getUser("usuario") ?? interaction.user;
      const member =
        interaction.guild.members.cache.get(target.id) ??
        (await interaction.guild.members.fetch(target.id).catch(() => null));
      const presence = await resolvePresence(interaction.guild, target.id);
      const reply = await buildActivityReply(
        target,
        member ?? null,
        presence,
        interaction.user.tag,
      );
      await interaction.editReply(reply);
    } catch (error) {
      console.error("Error en /activity:", error);
      await interaction.editReply({
        content:
          "❌ Ocurrió un error al intentar mostrar la actividad del usuario.",
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

      const lookupTarget = target ?? message.author;
      const member =
        message.guild.members.cache.get(lookupTarget.id) ??
        (await message.guild.members.fetch(lookupTarget.id).catch(() => null));
      const presence = await resolvePresence(message.guild, lookupTarget.id);
      const reply = await buildActivityReply(
        lookupTarget,
        member ?? null,
        presence,
        message.author.tag,
      );
      await message.reply(reply);
    } catch (error) {
      console.error("Error en prefix activity:", error);
      await message.reply(
        "❌ Ocurrió un error al intentar mostrar la actividad del usuario.",
      );
    }
  },
};

export default command;
