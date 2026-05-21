import { Collection, EmbedBuilder, Message, PartialMessage } from "discord.js";
import { ISnipeEntry, Snipe } from "../Models/Snipe";

export const SNIPE_MAX_ENTRIES = 100;
const SNIPE_EXPIRE_MS = 1000 * 60 * 60; // 1 hora
const EMBED_DESCRIPTION_LIMIT = 4000;

// ✦ el núcleo de velocidad: nuestro caché local
export const snipeCache = new Collection<string, ISnipeEntry[]>();

// ─── utilidades visuales ──────────────────────────────────────────────────────

export const buildSnipeFooter = (position: number, total: number) =>
  `snipe ${position}/${total} • hoshiko • expira en 1h`;

export const buildSnipeNotFoundMessage = (position: number, total: number) =>
  position === 1
    ? "no hay mensajes borrados recientes en este canal."
    : `solo tengo guardados **${total}** mensajes borrados aquí.`;

const normalizeSnipeDescription = (content: string | null | undefined) => {
  const text = content?.trim() || "*(solo imagen/sticker)*";
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
    .setColor(0x2b2d31) // color invisible para la estética minimalista
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

// ─── sistema híbrido ram + mongo ──────────────────────────────────────────────

// 1. hidratación: carga los snipes de mongo a la ram al encender
export const hydrateSnipes = async () => {
  const docs = await Snipe.find();
  const now = Date.now();

  for (const doc of docs) {
    const validSnipes = doc.snipes.filter(
      (entry) => now - entry.deletedAt.getTime() <= SNIPE_EXPIRE_MS,
    );
    if (validSnipes.length > 0) {
      snipeCache.set(doc.channelId, validSnipes);
    }
  }
  console.log(
    `[hoshiko] memoria de snipes sincronizada: ${snipeCache.size} canales listos.`,
  );
};

// 2. lectura: instantánea directo desde la ram
export const getSnipeEntry = (channelId: string, position: number) => {
  const snipes = snipeCache.get(channelId) || [];
  const now = Date.now();

  // filtramos los expirados al vuelo para no mostrar fantasmas
  const validSnipes = snipes.filter(
    (entry) => now - entry.deletedAt.getTime() <= SNIPE_EXPIRE_MS,
  );

  // actualizamos el caché si se limpió algo
  if (validSnipes.length !== snipes.length) {
    snipeCache.set(channelId, validSnipes);
  }

  if (!validSnipes.length) return { total: 0, entry: undefined };

  const index = position - 1;
  return {
    total: validSnipes.length,
    entry: validSnipes[index],
  };
};

// 3. escritura: guarda en ram al instante, respalda en mongo asíncronamente
export const recordDeletedMessage = (message: Message | PartialMessage) => {
  if (!message.guild || !message.author) return;

  const channelId = message.channel.id;
  const payload: ISnipeEntry = {
    content: message.content || "*(solo imagen/sticker)*",
    author: message.author.tag,
    authorId: message.author.id,
    authorAvatar: message.author.displayAvatarURL(),
    image: message.attachments?.first()?.proxyURL || null,
    deletedAt: new Date(),
  };

  // guardado instantáneo en ram
  const currentSnipes = snipeCache.get(channelId) || [];
  currentSnipes.unshift(payload);
  if (currentSnipes.length > SNIPE_MAX_ENTRIES) currentSnipes.pop();
  snipeCache.set(channelId, currentSnipes);

  // guardado de fondo en mongo (fire-and-forget, sin await)
  Snipe.findOneAndUpdate(
    { channelId },
    {
      $set: { guildId: message.guild.id },
      $push: {
        snipes: {
          $each: [payload],
          $position: 0,
          $slice: SNIPE_MAX_ENTRIES,
        },
      },
    },
    { upsert: true },
  ).catch((err) =>
    console.error("[hoshiko] error respaldando snipe en la db:", err),
  );
};
