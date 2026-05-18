import {
  ActivityType,
  ChatInputCommandInteraction,
  EmbedBuilder,
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

const STATUS_LABELS: Record<string, string> = {
  online: "🟢 En línea",
  idle: "🟡 Ausente",
  dnd: "🔴 No molestar",
  offline: "⚫ Desconectado",
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  [ActivityType.Playing]: "🎮",
  [ActivityType.Streaming]: "📡",
  [ActivityType.Listening]: "🎵",
  [ActivityType.Watching]: "📺",
  [ActivityType.Competing]: "🏆",
  [ActivityType.Custom]: "✨",
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

function formatTimestamp(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

function getSpotifyCover(activity: any): string | null {
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

function formatActivity(activity: any): string {
  if (activity.type === ActivityType.Listening && activity.name === "Spotify") {
    const track = activity.details || "Canción desconocida";
    const artist = activity.state || "Artista desconocido";
    const album = activity.assets?.largeText
      ? `\n   ├─ Álbum: ${activity.assets.largeText}`
      : "";
    const start = formatTimestamp(activity.timestamps?.start);
    const end = formatTimestamp(activity.timestamps?.end);
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
  const start = formatTimestamp(activity.timestamps?.start);
  const end = formatTimestamp(activity.timestamps?.end);
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

function getActivities(presence: Presence | null): {
  text: string | null;
  total: number;
  image?: string | null;
  color?: number | null;
} {
  if (!presence?.activities?.length)
    return { text: null, total: 0, image: null, color: null };

  const visibleActivities = presence.activities.filter(
    (activity) => activity.type !== ActivityType.Custom,
  );

  if (!visibleActivities.length)
    return { text: null, total: 0, image: null, color: null };

  const maxActivities = 3;
  const displayed = visibleActivities.slice(0, maxActivities);
  const text = displayed.map(formatActivity).join("\n\n");
  const spotifyImage = visibleActivities
    .map(getSpotifyCover)
    .find((url) => url) as string | null;
  const color = visibleActivities.some(
    (activity) =>
      activity.type === ActivityType.Listening && activity.name === "Spotify",
  )
    ? 0x1db954
    : null;

  return {
    text,
    total: visibleActivities.length,
    image: spotifyImage,
    color,
  };
}

function getCustomStatus(presence: Presence | null): string | null {
  if (!presence?.activities?.length) return null;

  const custom = presence.activities.find(
    (activity) => activity.type === ActivityType.Custom,
  );
  if (!custom) return null;

  const emoji = custom.emoji ? `${custom.emoji} ` : "";
  const state = custom.state || "";
  return `${emoji}${state}`.trim() || null;
}

const buildActivityEmbed = (
  target: User,
  member: GuildMember | null,
  presence: Presence | null,
  requester: string,
) => {
  const status = presence?.status ?? null;
  const activityData = getActivities(presence);
  const customStatus = getCustomStatus(presence);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Actividad actual de ${target.username}`)
    .setColor(activityData.color ?? member?.displayHexColor ?? 0x5865f2)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setDescription(
      `Aquí se muestra la actividad que Discord expone en tiempo real para este usuario. Incluye juegos, streaming, reproducción de música, estado personalizado y detalles de sesión cuando están disponibles.`,
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

  if (activityData.image) {
    embed.setImage(activityData.image);
  }

  if (customStatus) {
    embed.addFields({
      name: "┌─ ✨ Estado personalizado",
      value: `│ ${customStatus}\n└─`,
      inline: false,
    });
  }

  return embed;
};

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
      await interaction.reply({
        content: "❌ Este comando solo puede usarse dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    try {
      const target = interaction.options.getUser("usuario") ?? interaction.user;
      const cachedMember =
        interaction.guild.members.cache.get(target.id) ?? null;
      const member =
        cachedMember ??
        (await interaction.guild.members.fetch(target.id).catch(() => null));
      const persistedPresence: IPresenceHistory | null =
        !cachedMember?.presence && !member?.presence
          ? await PresenceHistoryManager.getPresence(
              target.id,
              interaction.guild.id,
            )
          : null;
      const presence =
        cachedMember?.presence ??
        member?.presence ??
        (persistedPresence
          ? ({
              status: persistedPresence.status,
              activities: persistedPresence.activities.map((activity) => ({
                type: activity.type as ActivityType,
                name: activity.name,
                details: activity.details,
                state: activity.state,
                url: activity.url,
                timestamps: activity.timestamps,
                assets: activity.assets,
                emoji: activity.emoji ? { name: activity.emoji } : undefined,
              })),
            } as Presence)
          : null);
      const embed = buildActivityEmbed(
        target,
        member,
        presence,
        interaction.user.tag,
      );
      await interaction.editReply({ embeds: [embed] });
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

      const lookupTarget = target || message.author;
      const cachedMember =
        message.guild.members.cache.get(lookupTarget.id) ?? null;
      const member =
        cachedMember ??
        (await message.guild.members.fetch(lookupTarget.id).catch(() => null));
      const persistedPresence: IPresenceHistory | null =
        !cachedMember?.presence && !member?.presence
          ? await PresenceHistoryManager.getPresence(
              lookupTarget.id,
              message.guild.id,
            )
          : null;
      const presence =
        cachedMember?.presence ??
        member?.presence ??
        (persistedPresence
          ? ({
              status: persistedPresence.status,
              activities: persistedPresence.activities.map((activity) => ({
                type: activity.type as ActivityType,
                name: activity.name,
                details: activity.details,
                state: activity.state,
                url: activity.url,
                timestamps: activity.timestamps,
                assets: activity.assets,
                emoji: activity.emoji ? { name: activity.emoji } : undefined,
              })),
            } as Presence)
          : null);
      const embed = buildActivityEmbed(
        lookupTarget,
        member,
        presence,
        message.author.tag,
      );
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error en prefix activity:", error);
      await message.reply(
        "❌ Ocurrió un error al intentar mostrar la actividad del usuario.",
      );
    }
  },
};

export default command;
