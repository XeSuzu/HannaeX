import { Collection, EmbedBuilder, Message, PartialMessage } from "discord.js";
import { ISnipeEntry, Snipe } from "../Database/moderation/snipe.model";

export const SNIPE_MAX_ENTRIES = 100;
const SNIPE_EXPIRE_MS = 1000 * 60 * 60; // 1 hora
const EMBED_DESCRIPTION_LIMIT = 4000;

// ✦ el núcleo de velocidad: nuestro caché local
export const snipeCache = new Collection<string, ISnipeEntry[]>();

// Limpieza periódica en RAM para prevenir fugas de memoria
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [channelId, entries] of snipeCache.entries()) {
      const valid = entries.filter(
        (entry) => now - entry.deletedAt.getTime() <= SNIPE_EXPIRE_MS,
      );
      if (valid.length === 0) {
        snipeCache.delete(channelId);
      } else if (valid.length !== entries.length) {
        snipeCache.set(channelId, valid);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

// ─── utilidades visuales ──────────────────────────────────────────────────────

export const buildSnipeFooter = (position: number, total: number) =>
  total > 1
    ? `🐾 Me dio curiosidad y lo guardé un ratito • ${position}/${total} • Expira en 1h`
    : `🐾 Me dio curiosidad y lo guardé un ratito • Expira en 1h`;

export const buildSnipeNotFoundMessage = (position: number, total: number) =>
  position === 1
    ? "no hay mensajes borrados recientes en este canal."
    : `solo tengo guardados **${total}** mensajes borrados aquí.`;

const normalizeSnipeDescription = (content: string | null | undefined) => {
  const raw = content?.trim();
  if (!raw) return "*(solo imagen/sticker)*";
  const text = raw.startsWith("> ") ? raw : `> ${raw}`;
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
    .setColor(0xffb7c5) // Rosa suave estético de Hoshiko
    .setAuthor({
      name: `${entry.author}`,
      iconURL: entry.authorAvatar,
    })
    .setDescription(normalizeSnipeDescription(entry.content))
    .setFooter({ text: buildSnipeFooter(position, total) })
    .setTimestamp(entry.deletedAt);

  if (entry.image) {
    embed.setImage(entry.image);
  }

  return embed;
};

// ─── extractor inteligente multi-fuente de imágenes y gifs ───────────────────

export function extractMediaUrl(
  message: Message | PartialMessage,
): string | null {
  // 1. Archivo adjunto que sea imagen o GIF animado
  if (message.attachments && message.attachments.size > 0) {
    const imageAttachment = message.attachments.find((att) => {
      if (att.contentType?.startsWith("image/")) return true;
      return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(att.url);
    });
    if (imageAttachment) {
      return imageAttachment.url || imageAttachment.proxyURL || null;
    }
  }

  // 2. Sticker de Discord (estático o animado)
  if (message.stickers && message.stickers.size > 0) {
    const sticker = message.stickers.first();
    if (sticker?.url) return sticker.url;
  }

  // 3. GIF o Imagen generado por Embed de Discord (Tenor / Giphy)
  if (message.embeds && message.embeds.length > 0) {
    const firstEmbed = message.embeds[0];
    if (firstEmbed.image?.url) return firstEmbed.image.url;
    if (firstEmbed.thumbnail?.url) return firstEmbed.thumbnail.url;
    if (firstEmbed.video?.url && (firstEmbed.data as any).type === "gifv") {
      return firstEmbed.video.url;
    }
  }

  // 4. Enlace directo a imagen o GIF en el contenido
  if (message.content) {
    const match = message.content.match(
      /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S*)?/i,
    );
    if (match) return match[0];
  }

  return null;
}

// ─── sistema híbrido ram + mongo ──────────────────────────────────────────────

// 1. hidratación: carga los snipes de mongo a la ram al encender
export const hydrateSnipes = async () => {
  const now = Date.now();
  const docs = await Snipe.find();

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
  const mediaUrl = extractMediaUrl(message);

  const payload: ISnipeEntry = {
    content: message.content || "*(solo imagen/sticker)*",
    author: message.author.tag,
    authorId: message.author.id,
    authorAvatar: message.author.displayAvatarURL(),
    image: mediaUrl,
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
