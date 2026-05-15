import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { ISnipe, ISnipeEntry, Snipe } from "../Models/Snipe";

export const SNIPE_MAX_ENTRIES = 100;
const SNIPE_EXPIRE_MS = 1000 * 60 * 60; // 1 hora
const EMBED_DESCRIPTION_LIMIT = 4000;

export const buildSnipeFooter = (position: number, total: number) =>
  `Snipe ${position}/${total} • Hoshiko 🐾 • Expira en 1h`;

export const buildSnipeNotFoundMessage = (position: number, total: number) =>
  position === 1
    ? "Nyaa~ no hay mensajes borrados recientes en este canal. 🧹"
    : `Solo tengo guardados **${total}** mensajes borrados aquí.`;

const normalizeSnipeDescription = (content: string | null | undefined) => {
  const text = content?.trim() || "*(Solo imagen/sticker)*";
  return text.length > EMBED_DESCRIPTION_LIMIT
    ? `${text.slice(0, EMBED_DESCRIPTION_LIMIT)}…`
    : text;
};

export const buildSnipeEmbed = (
  entry: ISnipeEntry,
  position: number,
  total: number,
) => {
  const embed = new EmbedBuilder()
    .setColor("Random")
    .setAuthor({
      name: `${entry.author} borró esto:`,
      iconURL: entry.authorAvatar,
    })
    .setDescription(normalizeSnipeDescription(entry.content))
    .setFooter({ text: buildSnipeFooter(position, total) })
    .setTimestamp(entry.deletedAt);

  if (entry.image) embed.setImage(entry.image);
  return embed;
};

const cleanExpiredSnipes = async (doc: ISnipe) => {
  const now = Date.now();
  const freshSnipes = doc.snipes.filter(
    (entry) => now - entry.deletedAt.getTime() <= SNIPE_EXPIRE_MS,
  );

  if (freshSnipes.length !== doc.snipes.length) {
    doc.snipes = freshSnipes;
    await doc.save();
  }

  return doc;
};

export const getSnipeEntry = async (channelId: string, position: number) => {
  const doc = await Snipe.findOne({ channelId });
  if (!doc || !doc.snipes.length)
    return { doc: null, total: 0, entry: undefined };

  const cleanedDoc = await cleanExpiredSnipes(doc);
  const index = position - 1;
  return {
    doc: cleanedDoc,
    total: cleanedDoc.snipes.length,
    entry: cleanedDoc.snipes[index],
  };
};

export const recordDeletedMessage = async (
  message: Message | PartialMessage,
) => {
  if (!message.guild || !message.author) return;

  const payload = {
    content: message.content || "*(Solo imagen/sticker)*",
    author: message.author.tag,
    authorId: message.author.id,
    authorAvatar: message.author.displayAvatarURL(),
    image: message.attachments?.first()?.proxyURL || null,
    deletedAt: new Date(),
  };

  const guildId = message.guild.id;
  const doc = await Snipe.findOneAndUpdate(
    { channelId: message.channel.id },
    {
      $set: { guildId },
      $push: {
        snipes: {
          $each: [payload],
          $position: 0,
          $slice: SNIPE_MAX_ENTRIES,
        },
      },
    },
    { upsert: true, new: true },
  );

  if (doc) {
    await cleanExpiredSnipes(doc);
  }
};
