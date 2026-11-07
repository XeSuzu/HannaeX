import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Message,
  User,
} from "discord.js";
import type { ContextualImageResult } from "../Media/ContextualImageService";

export const HOSHIKO_COLOR = 0xff8fab; // Rosa Hoshiko
export const MAX_EMBED_DESCRIPTION = 3800; // Margen de seguridad sobre el límite de 4096

export interface AiEmbedOptions {
  authorUser: User;
  botUser: User;
  mode?: string;
  imageResult?: ContextualImageResult | null;
  page?: number;
  totalPages?: number;
}

export class AiEmbedBuilder {
  /**
   * Divide un texto largo en páginas respetando párrafos, oraciones o espacios.
   */
  static splitIntoPages(text: string, maxLen = MAX_EMBED_DESCRIPTION): string[] {
    const clean = (text || "").trim();
    if (clean.length <= maxLen) return [clean];

    const pages: string[] = [];
    let remaining = clean;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        pages.push(remaining);
        break;
      }

      let splitIndex = -1;

      // 1. Intentar cortar por párrafo doble (\n\n)
      const paragraphIdx = remaining.lastIndexOf("\n\n", maxLen);
      if (paragraphIdx > maxLen * 0.5) {
        splitIndex = paragraphIdx + 2;
      }

      // 2. Intentar cortar por salto de línea simple (\n)
      if (splitIndex === -1) {
        const lineIdx = remaining.lastIndexOf("\n", maxLen);
        if (lineIdx > maxLen * 0.5) {
          splitIndex = lineIdx + 1;
        }
      }

      // 3. Intentar cortar por punto y espacio (. )
      if (splitIndex === -1) {
        const periodIdx = remaining.lastIndexOf(". ", maxLen);
        if (periodIdx > maxLen * 0.5) {
          splitIndex = periodIdx + 2;
        }
      }

      // 4. Cortar por último espacio
      if (splitIndex === -1) {
        const spaceIdx = remaining.lastIndexOf(" ", maxLen);
        if (spaceIdx > 0) {
          splitIndex = spaceIdx + 1;
        } else {
          splitIndex = maxLen;
        }
      }

      pages.push(remaining.slice(0, splitIndex).trim());
      remaining = remaining.slice(splitIndex).trim();
    }

    return pages;
  }

  /**
   * Construye un Embed estilizado con la identidad de Hoshiko.
   */
  static buildEmbed(pageText: string, options: AiEmbedOptions): EmbedBuilder {
    const { authorUser, botUser, mode = "neko", imageResult, page = 1, totalPages = 1 } = options;

    const embed = new EmbedBuilder()
      .setColor(HOSHIKO_COLOR)
      .setAuthor({
        name: "🌸 Hoshiko",
        iconURL: botUser?.displayAvatarURL ? botUser.displayAvatarURL() : undefined,
      })
      .setDescription(pageText || "...")
      .setTimestamp();

    if (imageResult?.url) {
      embed.setImage(imageResult.url);
    }

    const pageStr = totalPages > 1 ? `Página ${page} de ${totalPages} • ` : "";
    const sourceStr = imageResult ? ` • Imagen: ${imageResult.source}` : "";
    embed.setFooter({
      text: `💡 Modo: ${mode} • ${pageStr}En respuesta a ${authorUser?.username || "usuario"}${sourceStr}`,
      iconURL: authorUser?.displayAvatarURL ? authorUser.displayAvatarURL() : undefined,
    });

    return embed;
  }

  /**
   * Genera los botones de navegación de paginación interactiva.
   */
  static buildActionRow(pageIndex: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ai_page_first")
        .setEmoji("⏮️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId("ai_page_prev")
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId("ai_page_info")
        .setLabel(`${pageIndex + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("ai_page_next")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === totalPages - 1),
      new ButtonBuilder()
        .setCustomId("ai_page_last")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === totalPages - 1),
      new ButtonBuilder()
        .setCustomId("ai_page_close")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger),
    );
  }

  /**
   * Envía la respuesta en Embed, gestionando paginación interactiva y autorización de usuario.
   */
  static async sendPaginatedReply(
    message: Message,
    fullText: string,
    options: {
      botUser: User;
      mode?: string;
      imageResult?: ContextualImageResult | null;
    },
  ): Promise<Message> {
    const pages = this.splitIntoPages(fullText);
    const totalPages = pages.length;
    let currentPage = 0;

    const baseOptions: AiEmbedOptions = {
      authorUser: message.author,
      botUser: options.botUser,
      mode: options.mode,
      imageResult: options.imageResult,
      page: 1,
      totalPages,
    };

    if (totalPages <= 1) {
      const singleEmbed = this.buildEmbed(pages[0], baseOptions);
      return await message.reply({ embeds: [singleEmbed] });
    }

    // Paginación interactiva con botones
    const firstEmbed = this.buildEmbed(pages[0], baseOptions);
    const actionRow = this.buildActionRow(currentPage, totalPages);

    const replyMsg = await message.reply({
      embeds: [firstEmbed],
      components: [actionRow],
    });

    if (typeof replyMsg?.createMessageComponentCollector !== "function") {
      return replyMsg;
    }

    const collector = replyMsg.createMessageComponentCollector({
      filter: (i: any) => {
        if (message.author?.id && i.user?.id !== message.author.id) {
          void i.reply({
            content: "🌸 Solo la persona que hizo la pregunta puede navegar por las páginas.",
            ephemeral: true,
          });
          return false;
        }
        return true;
      },
      time: 120_000, // 2 minutos de expiración de controles
    });

    collector.on("collect", async (i: ButtonInteraction) => {
      await i.deferUpdate();

      if (i.customId === "ai_page_close") {
        collector.stop("user_closed");
        await replyMsg.delete().catch(() => null);
        return;
      }

      if (i.customId === "ai_page_first") currentPage = 0;
      else if (i.customId === "ai_page_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "ai_page_next") currentPage = Math.min(totalPages - 1, currentPage + 1);
      else if (i.customId === "ai_page_last") currentPage = totalPages - 1;

      const updatedEmbed = this.buildEmbed(pages[currentPage], {
        ...baseOptions,
        page: currentPage + 1,
      });
      const updatedRow = this.buildActionRow(currentPage, totalPages);

      await replyMsg.edit({
        embeds: [updatedEmbed],
        components: [updatedRow],
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (reason === "user_closed") return;
      // Retirar componentes expirados para no dejar botones muertos en el canal
      await replyMsg.edit({ components: [] }).catch(() => null);
    });

    return replyMsg;
  }
}
