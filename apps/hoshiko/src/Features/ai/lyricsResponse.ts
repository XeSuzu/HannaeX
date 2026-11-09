import { EmbedBuilder, type Message } from "discord.js";
import {
  buildLyricsButtons,
  buildLyricsPageEmbed,
  findLyrics,
  normalizeLyricsQuery,
  splitLyricsBySection,
} from "../../Services/Lyrics";
import type { ParsedLyricsCommand } from "../../Services/Lyrics/types";
import { markAsAiMessage } from "./adminMessageTracker";

export interface LyricsStatusStep {
  title: string;
  detail: string;
  footer: string;
}

export const LYRICS_PROGRESS_STEPS: LyricsStatusStep[] = [
  {
    title: "🔍 Buscando canción",
    detail: "Rastreando pistas y coincidencias en bases de datos musicales...",
    footer: "Etapa 1 de 5 • Búsqueda en catálogo musical",
  },
  {
    title: "🌐 Cotejando proveedores",
    detail: "Consultando LRCLIB, Genius y fuentes sincronizadas...",
    footer: "Etapa 2 de 5 • Conexión de proveedores",
  },
  {
    title: "🎶 Traduciendo y adaptando si es necesario",
    detail: "Detectando idioma original y verificando variantes disponibles...",
    footer: "Etapa 3 de 5 • Análisis de idioma y traducción",
  },
  {
    title: "📝 Organizando estrofas",
    detail: "Estructurando versos, coros y métrica por secciones...",
    footer: "Etapa 4 de 5 • Formato y paginación",
  },
  {
    title: "✨ Pulido y presentación",
    detail: "Ajustando carátula y preparando la visualización interactiva...",
    footer: "Etapa 5 de 5 • Finalizando entrega",
  },
];

export function createLyricsProgressEmbed(
  botUser?: any,
  stepIndex: number = 0,
): EmbedBuilder {
  const step =
    LYRICS_PROGRESS_STEPS[
      Math.min(Math.max(0, stepIndex), LYRICS_PROGRESS_STEPS.length - 1)
    ];
  const embed = new EmbedBuilder()
    .setColor(0xffe4e1)
    .setDescription(`**${step.title}**\n*${step.detail}*`);

  if (botUser && typeof botUser.displayAvatarURL === "function") {
    embed.setAuthor({
      name: "Hoshiko",
      iconURL: botUser.displayAvatarURL(),
    });
  }

  embed.setFooter({ text: step.footer });
  return embed;
}

export async function handleLyricsResponse(
  message: Message,
  parsedLyrics: ParsedLyricsCommand,
): Promise<void> {
  const initialEmbed = createLyricsProgressEmbed(message.client?.user, 0);
  const waiting = await message.reply({ embeds: [initialEmbed] });
  if (waiting?.id) markAsAiMessage(waiting.id);

  const startTime = Date.now();
  const minWaitMs = 10000;
  let currentStep = 0;

  const rotatorInterval = setInterval(async () => {
    try {
      currentStep++;
      if (currentStep < LYRICS_PROGRESS_STEPS.length) {
        const nextEmbed = createLyricsProgressEmbed(
          message.client?.user,
          currentStep,
        );
        await waiting.edit({ embeds: [nextEmbed] }).catch(() => null);
      }
    } catch {}
  }, 2000);

  const normalizedQuery = normalizeLyricsQuery(parsedLyrics);
  let result: any = null;
  let lookupError: any = null;

  try {
    result = await findLyrics(normalizedQuery);
  } catch (err) {
    lookupError = err;
  }

  const elapsed = Date.now() - startTime;
  if (elapsed < minWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, minWaitMs - elapsed));
  }
  clearInterval(rotatorInterval);

  if (lookupError || !result?.found || !result?.lyrics) {
    const queryDisplay = parsedLyrics.artist
      ? `${parsedLyrics.song} - ${parsedLyrics.artist}`
      : parsedLyrics.cleaned || parsedLyrics.song;

    const notFoundEmbed = new EmbedBuilder()
      .setColor(0xff8fab)
      .setTitle("😿 No encontré la letra de esa canción~")
      .setDescription(
        lookupError
          ? "Ocurrió un error inesperado al conectar con los proveedores de música. Por favor, intenta de nuevo en unos momentos."
          : `No logré encontrar la letra para **"${queryDisplay}"** en los catálogos disponibles.\n\n**Sugerencias:**\n• Revisa que el nombre del tema o artista esté bien escrito (ej. \`hoshi ask letra de Título - Artista\`).\n• Si buscas una versión traducida o romanizada (romaji, pinyin, español), puedes pedirme directamente:\n  \`hoshi ask traduce la letra de ${queryDisplay}\``,
      )
      .setFooter({ text: "Hoshiko • Catálogo musical" });

    if (
      message.client?.user &&
      typeof message.client.user.displayAvatarURL === "function"
    ) {
      notFoundEmbed.setAuthor({
        name: "Hoshiko",
        iconURL: message.client.user.displayAvatarURL(),
      });
    }

    await waiting.edit({ embeds: [notFoundEmbed] }).catch(() => null);
    return;
  }

  const pages = splitLyricsBySection(result.lyrics);
  let page = 0;
  const total = pages.length;
  const firstEmbed = await buildLyricsPageEmbed(result, pages, page);
  await waiting.edit({
    content: null,
    embeds: [firstEmbed],
    components: total > 1 ? [buildLyricsButtons(page, total)] : [],
  });
  if (total <= 1) return;

  const collector = waiting.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 180_000,
  });

  collector.on("collect", async (i) => {
    await i.deferUpdate();
    if (i.customId === "lyrics_close") {
      collector.stop();
      await waiting.delete().catch(() => null);
      return;
    }
    if (i.customId === "lyrics_first") page = 0;
    else if (i.customId === "lyrics_prev") page = Math.max(0, page - 1);
    else if (i.customId === "lyrics_next") page = Math.min(total - 1, page + 1);
    else if (i.customId === "lyrics_last") page = total - 1;

    const updatedEmbed = await buildLyricsPageEmbed(result, pages, page);
    await waiting.edit({
      embeds: [updatedEmbed],
      components: [buildLyricsButtons(page, total)],
    });
  });

  collector.on("end", async () => {
    await waiting.edit({ components: [] }).catch(() => {});
  });
}
