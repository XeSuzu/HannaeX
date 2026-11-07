import { EmbedBuilder, type User } from "discord.js";
import type { ContextualImageResult } from "../Media/ContextualImageService";

export interface EmbedComposerOptions {
  botUser?: User | null;
  authorUsername?: string;
  imageResult?: ContextualImageResult | null;
  footerText?: string;
}

export class EmbedComposer {
  private static readonly COLOR_PRIMARY = 0xffb7c5; // Rosa pastel cálido Hoshiko
  private static readonly MAX_EMBED_CHARS = 4000;

  static compose(
    content: string,
    options: EmbedComposerOptions = {},
  ): EmbedBuilder[] {
    const text = (content || "").trim();
    if (!text) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(this.COLOR_PRIMARY)
        .setDescription("...")
        .setFooter({ text: "Hoshiko AI ♡" });
      return [emptyEmbed];
    }

    // Dividir en bloques si excede el tamaño máximo por embed
    const chunks: string[] = [];
    if (text.length <= this.MAX_EMBED_CHARS) {
      chunks.push(text);
    } else {
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= this.MAX_EMBED_CHARS) {
          chunks.push(remaining);
          break;
        }
        // Cortar en el último salto de línea antes del límite
        let splitIndex = remaining.lastIndexOf("\n\n", this.MAX_EMBED_CHARS);
        if (splitIndex === -1 || splitIndex < 2000) {
          splitIndex = remaining.lastIndexOf("\n", this.MAX_EMBED_CHARS);
        }
        if (splitIndex === -1 || splitIndex < 2000) {
          splitIndex = remaining.lastIndexOf(". ", this.MAX_EMBED_CHARS);
        }
        if (splitIndex === -1) {
          splitIndex = this.MAX_EMBED_CHARS;
        }

        chunks.push(remaining.slice(0, splitIndex).trim());
        remaining = remaining.slice(splitIndex).trim();
      }
    }

    // Limitar a máximo 3 embeds según las especificaciones de diseño
    const cappedChunks = chunks.slice(0, 3);
    const embeds: EmbedBuilder[] = [];

    cappedChunks.forEach((chunk, index) => {
      const embed = new EmbedBuilder()
        .setColor(this.COLOR_PRIMARY)
        .setDescription(chunk);

      if (index === 0 && options.botUser) {
        embed.setAuthor({
          name: "Hoshiko",
          iconURL: options.botUser.displayAvatarURL(),
        });
      }

      // La imagen ilustrativa se coloca en el primer o último embed
      if (index === 0 && options.imageResult?.url) {
        embed.setImage(options.imageResult.url);
      }

      // Footer en el último embed
      if (index === cappedChunks.length - 1) {
        let footer = options.footerText || "Hoshiko AI ♡";
        if (options.imageResult?.title) {
          footer += ` • Imagen: ${options.imageResult.title.slice(0, 30)}`;
        }
        embed.setFooter({ text: footer });
      }

      embeds.push(embed);
    });

    return embeds;
  }
}
