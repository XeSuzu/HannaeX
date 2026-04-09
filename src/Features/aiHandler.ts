import { Content } from "@google/generative-ai";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import { IAConfigManager } from "../Database/IAConfigManager";
import { PremiumManager } from "../Database/PremiumManager";
import { UserMemoryManager } from "../Database/UserMemoryManager";
import { HoshikoClient } from "../index";
import ServerConfig from "../Models/serverConfig";
import { extractFacts, generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";
import { SearchService, isQuerySafe } from "../Services/search";
import { SystemPromptContext, SystemPrompts } from "../Utils/AI/SystemPrompts";

const antiSpamCooldown = new Set<string>();
const processedMessages = new Set<string>();

// Lista negra de términos para IA (no para búsqueda de imágenes)
// Términos que siempre bloqueamos
const AI_BLOCKED_TERMS = new Set([
  "como suicidarme",
  "como matarme",
  "ways to die",
  "suicide methods",
  "como hacer una bomba",
  "como hacer explosivos",
  "how to make bomb",
  "receta para hacer drogas",
  "como cocinar metanfetamina",
  "como hackear",
  "como doxxear",
  "guia para hackear",
]);

// Términos sensibles que requieren respuesta cuidadosa
const AI_SENSITIVE_TERMS = [
  "suicid",
  "autolesion",
  "depresion",
  "ansiedad",
  " self harm",
  "sexo explicito",
  "pornografia",
  "como tener sexo",
];

function containsBlockedTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return Array.from(AI_BLOCKED_TERMS).some((term) => lower.includes(term));
}

function containsSensitiveTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return AI_SENSITIVE_TERMS.some((term) => lower.includes(term));
}

function shouldBlockMessage(text: string): { block: boolean; reason?: string } {
  if (containsBlockedTerm(text)) {
    return { block: true, reason: " Ese tema no puedo tocarlo~" };
  }
  return { block: false };
}

export default async (
  message: Message,
  client: HoshikoClient,
  forced: boolean = false,
): Promise<boolean> => {
  if (message.author.bot || !message.guild) return false;

  // =============================================================
  // 🛡️ GUARD PRINCIPAL — evita doble procesamiento del mismo mensaje
  // =============================================================
  if (processedMessages.has(message.id)) return false;

  let config = await ServerConfig.findOne({ guildId: message.guild.id });
  if (!config) config = new ServerConfig({ guildId: message.guild.id });

  // --- ✨ BÚSQUEDA DE IMÁGENES CON PAGINACIÓN ---
  const prefix = config.prefix || "x";
  const imgAskMatch = message.content.match(
    /^(?:hoshi ask img|neko ask img)\s+(.+)/i,
  );
  const prefixCommandMatch = message.content.match(
    new RegExp(`^\\${prefix}(img|ximg)\\s+(.+)`, "i"),
  );

  if (imgAskMatch || prefixCommandMatch) {
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 5000);

    const query = (
      imgAskMatch ? imgAskMatch[1] : prefixCommandMatch![2]
    ).trim();

    const isNsfwChannel =
      message.channel instanceof TextChannel &&
      (message.channel as TextChannel).nsfw;

    if (!isNsfwChannel && !isQuerySafe(query)) {
      await message.reply(
        "Hmm~ esa búsqueda no puedo hacerla aquí. Probá con algo más general o prueba en un canal NSFW si lo necesitas~",
      );
      return true;
    }

    const waitingMsg = await message.reply(
      `🔍 Dejame buscar **${query}**... un seg~`,
    );

    try {
      const results = await SearchService.searchImages(
        query,
        10,
        !isNsfwChannel,
      );

      if (!results || results.length === 0) {
        await waitingMsg.edit(
          `Hmm~ no encontré nada para **${query}**. Probá con otras palabras clave~`,
        );
        return true;
      }

      let page = 0;
      const total = results.length;

      const buildProgress = (index: number, total: number) => {
        const filled = Math.round((index / (total - 1)) * 8);
        return "▰".repeat(filled) + "▱".repeat(8 - filled);
      };

      const buildEmbed = (index: number) => {
        const img = results[index];
        const progress = buildProgress(index, total);
        return new EmbedBuilder()
          .setColor(0xff8fab)
          .setAuthor({
            name: `🔍 ${query}`,
            iconURL: client.user?.displayAvatarURL(),
          })
          .setTitle(img.title?.substring(0, 256) || query)
          .setURL(img.link)
          .setImage(img.imageUrl)
          .addFields(
            {
              name: "🌐 Fuente",
              value: `[${img.source}](${img.link})`,
              inline: true,
            },
            {
              name: "🖼️ Resultado",
              value: `\`${index + 1} de ${total}\``,
              inline: true,
            },
          )
          .setFooter({
            text: `${progress} • pedida por ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          });
      };

      const buildButtons = (index: number) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("img_first")
            .setEmoji("⏮️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
          new ButtonBuilder()
            .setCustomId("img_prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === 0),
          new ButtonBuilder()
            .setCustomId("img_next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === total - 1),
          new ButtonBuilder()
            .setCustomId("img_last")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === total - 1),
          new ButtonBuilder()
            .setCustomId("img_close")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),
        );

      await waitingMsg.edit({
        content: null,
        embeds: [buildEmbed(page)],
        components: [buildButtons(page)],
      });

      const collector = waitingMsg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 120_000,
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "img_close") {
          collector.stop();
          return;
        }
        if (i.customId === "img_first") page = 0;
        else if (i.customId === "img_prev") page = Math.max(0, page - 1);
        else if (i.customId === "img_next")
          page = Math.min(total - 1, page + 1);
        else if (i.customId === "img_last") page = total - 1;
        await waitingMsg.edit({
          embeds: [buildEmbed(page)],
          components: [buildButtons(page)],
        });
      });

      collector.on("end", async () => {
        await waitingMsg.edit({ components: [] }).catch(() => {});
      });
    } catch (error) {
      console.error("[aiHandler Img] Error:", error);
      await waitingMsg.edit(
        "Ups~ algo salió mal buscando imágenes. Podés intentar de nuevo?",
      );
    }
    return true;
  }

  const aiSystem = config.aiSystem || {
    mode: "neko",
    behavior: "normal",
    randomChance: 3,
    spontaneousChannels: [],
  };
  const isPremium = await PremiumManager.isPremium(message.guild.id);

  // --- 🎵 CANCIONES ---
  const lyricsMatch = message.content.match(
    /(?:letra de|busca la letra de|dame la letra de)\s+(.+?)(?:\s+de\s+|\s+-\s+)(.+)|(?:letra de|busca la letra de|dame la letra de)\s+(.+)/i,
  );
  if (lyricsMatch) {
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 5000);

    const cancion = (lyricsMatch[1] || lyricsMatch[3])
      ?.replace(/-/g, " ")
      .trim();
    const artista = lyricsMatch[2]?.replace(/-/g, " ").trim() || null;
    const waiting = await message.reply("🎶 Buscando...");
    const letra = await buscarLetraGenius(artista, cancion);
    if (letra) {
      const embed = new EmbedBuilder()
        .setTitle(cancion.toUpperCase())
        .setDescription(letra)
        .setColor(0xffff00);
      await waiting.edit({ content: null, embeds: [embed] });
      return true;
    }
    await waiting.edit("😿 No la encontré...");
    return true;
  }

  // --- 🚨 DETECCIÓN DE GATILLOS ---
  const isMentioned = message.mentions.users.has(client.user!.id);
  const prefixMatch = message.content.toLowerCase().startsWith("hoshi ask ");

  let isReplyToMe = false;
  if (isPremium && message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      if (repliedMsg.author.id === client.user!.id) isReplyToMe = true;
    } catch (e) {}
  }

  const isDirectInteraction =
    forced || isMentioned || prefixMatch || isReplyToMe;

  // Si no es forced y tiene gatillos directos → salir (messageCreate lo manejará con forced=true)
  if (!forced && (isMentioned || prefixMatch || isReplyToMe)) return false;

  // --- 🎲 GATILLO ESPONTÁNEO ---
  let isRandomTrigger = false;
  if (!isDirectInteraction) {
    const allowedChannels = aiSystem.spontaneousChannels || [];
    if (allowedChannels.includes(message.channel.id)) {
      isRandomTrigger = Math.random() * 100 < (aiSystem.randomChance || 3);
    }
  }

  // --- 🔋 COOLDOWN ---
  const isOnCooldown = new Date(aiSystem.cooldownUntil || 0) > new Date();
  if (!isDirectInteraction && (!isRandomTrigger || isOnCooldown)) return false;

  // --- 🛡️ ANTI SPAM ---
  if (antiSpamCooldown.has(message.channel.id)) return false;
  antiSpamCooldown.add(message.channel.id);
  setTimeout(() => antiSpamCooldown.delete(message.channel.id), 2500);

  // --- 🚫 FILTRO DE CONTENIDO PARA IA ---
  // Solo verificamos si es una interacción directa (mencion, hoshi ask, respuesta)
  if (isDirectInteraction) {
    const filterResult = shouldBlockMessage(message.content);
    if (filterResult.block) {
      const responses = [
        "Hmm~ sobre ese tema prefiero no opinar, mejor hablemos de otra cosa?",
        "Mmm~ eso no es algo de lo que me guste hablar. Qué otro tema te interesa?",
        "Uy~ ese tema me da cosa tocarlo jaja. Cambiamos de tema?",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];
      await message.reply(`${randomResponse}${filterResult.reason || ""}`);
      return true;
    }
  }

  // Marcar mensaje como procesado AQUÍ — después de todos los guards
  processedMessages.add(message.id);
  setTimeout(() => processedMessages.delete(message.id), 10000);

  if (isDirectInteraction && "sendTyping" in message.channel) {
    await (message.channel as any).sendTyping().catch(() => null);
  }

  try {
    const limit = isPremium ? 15 : 10;
    const prevMessages = await (message.channel as any).messages.fetch({
      limit,
    });

    const triggerType: SystemPromptContext["triggerType"] = isRandomTrigger
      ? "spontaneous"
      : isReplyToMe
        ? "reply"
        : "direct";

    const channelName =
      "name" in message.channel ? (message.channel as any).name : undefined;
    const userFacts = await UserMemoryManager.getFacts(
      message.author.id,
      message.guild.id,
    );

    const promptContext: SystemPromptContext = {
      guildName: message.guild.name,
      channelName,
      triggerType,
      userFacts,
      currentUsername: message.author.username,
    };

    const systemInstruction = SystemPrompts.getInstruction(
      config,
      promptContext,
    );
    const historyForApi: Content[] = [];
    const sortedMessages = Array.from(prevMessages.values())
      .reverse()
      .slice(0, -1);

    for (const m of sortedMessages) {
      const msgObj = m as Message;
      if (!msgObj.content && msgObj.attachments.size === 0) continue;
      const role = msgObj.author.id === client.user!.id ? "model" : "user";
      let textContent = msgObj.content.replace(/<@!?[0-9]+>/g, "").trim();
      if (msgObj.attachments.size > 0 && role === "user")
        textContent += " [El usuario envió una imagen/archivo]";
      const finalWord =
        role === "user"
          ? `[${msgObj.author.username} dice]: ${textContent || "..."}`
          : textContent;
      historyForApi.push({ role, parts: [{ text: finalWord || "..." }] });
    }

    let userMessage = message.content
      .replace(new RegExp(`<@!?${client.user!.id}>`, "g"), "")
      .trim();
    if (!userMessage && isMentioned) userMessage = "Hola";
    if (prefixMatch) userMessage = message.content.substring(10).trim();

    if (
      message.attachments.size > 0 &&
      message.attachments.first()?.contentType?.startsWith("image/")
    ) {
      try {
        const imgResponse = await fetch(message.attachments.first()!.url);
        const imgBuffer = await imgResponse.arrayBuffer();
        historyForApi.push({
          role: "user",
          parts: [
            {
              text: `${userMessage || "Mira esta imagen:"}`,
            },
            {
              inlineData: {
                mimeType: message.attachments.first()!.contentType!,
                data: Buffer.from(imgBuffer).toString("base64"),
              },
            },
          ],
        });
      } catch (err) {
        historyForApi.push({
          role: "user",
          parts: [
            {
              text: `[${message.author.username} dice]: ${userMessage} [Error al cargar la imagen enviada]`,
            },
          ],
        });
      }
    } else {
      historyForApi.push({
        role: "user",
        parts: [
          {
            text: `${userMessage}`,
          },
        ],
      });
    }

    const safetyMode =
      (config.aiSafety as "relaxed" | "standard" | "strict") || "standard";
    const stream = await generateResponseStream(
      systemInstruction,
      historyForApi,
      safetyMode,
    );

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.finishReason === "SAFETY")
        throw new Error("PROHIBITED_CONTENT");
      fullText += chunk.text();
    }

    // --- ✂️ CHUNKS ---
    const MAX = 1996;
    const cleanText = (fullText.trim() || "...").replace(/^>>>\s*/, "");

    if (cleanText.length <= MAX) {
      await message.reply(cleanText);
    } else {
      const chunks: string[] = [];
      let remaining = cleanText;
      while (remaining.length > 0) {
        if (remaining.length <= MAX) {
          chunks.push(remaining);
          break;
        }
        let cutAt = remaining.lastIndexOf(" ", MAX);
        if (cutAt === -1) cutAt = MAX;
        chunks.push(remaining.substring(0, cutAt));
        remaining = remaining.substring(cutAt).trim();
      }
      await message.reply(chunks[0]);
      for (let i = 1; i < chunks.length; i++) {
        await (message.channel as any).send(chunks[i]);
      }
    }

    extractFacts(message.author.username, userMessage, message.author.id)
      .then((facts) => {
        if (facts.length > 0)
          return UserMemoryManager.addFacts(
            message.author.id,
            message.guild!.id,
            facts,
          );
      })
      .catch((err) => console.warn("[AI] ⚠️ Error guardando facts:", err));

    if (!isDirectInteraction) {
      const cooldownMinutes = isPremium ? 0.3 : 10;
      await IAConfigManager.setCooldown(message.guild.id, cooldownMinutes);
    }
  } catch (error: any) {
    if (error.message === "PROHIBITED_CONTENT") {
      await message.reply(
        "Auch~ ese tema me da cosa responderlo, mis filtros no me dejan 🤐",
      );
    } else {
      console.error(`[AI] 💥 Error inesperado procesando respuesta:`, error);
      if (isDirectInteraction)
        await message.reply(
          "Oops~ se me cruzaron los cables ahí jaja. Probá preguntando de nuevo?",
        );
    }
  }
  return true;
};
