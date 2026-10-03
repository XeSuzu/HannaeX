import { Message } from "discord.js";
import { IAConfigManager } from "../Database/IAConfigManager";
import { PremiumManager } from "../Database/PremiumManager";
import { UserMemoryManager } from "../Database/UserMemoryManager";
import type { HoshikoClient } from "../client/HoshikoClient";
import ServerConfig from "../Models/serverConfig";
import { extractFacts } from "../Services/gemini";
import { parseLyricsCommand } from "../Services/Lyrics";
import { containsPromptInjection } from "../Utils/triggerConditions";
import { buildConversationContext } from "./ai/conversationContext";
import { sendConversationReply } from "./ai/conversationReply";
import { handleImageSearch } from "./ai/imageSearch";
import { handleLyricsResponse } from "./ai/lyricsResponse";
import { shouldBlockMessage } from "./ai/contentPolicy";

const antiSpamCooldown = new Set<string>();
const processedMessages = new Set<string>();
const userAiCooldown = new Map<string, number>();
const USER_AI_COOLDOWN_MS = 3000;

export default async (
  message: Message,
  client: HoshikoClient,
  forced: boolean = false,
): Promise<boolean> => {
  if (message.author.bot || !message.guild) return false;
  if (processedMessages.has(message.id)) return false;

  let config = await ServerConfig.findOne({ guildId: message.guild.id });
  if (!config) config = new ServerConfig({ guildId: message.guild.id });

  // --- ✨ BÚSQUEDA DE IMÁGENES ---
  const prefix = config.prefix || "x";
  const imgAskMatch = message.content.match(/^(?:hoshi ask img|neko ask img)\s+(.+)/i);
  // TODO: revisar el escape del prefijo x en una fase aprobada; preservar ahora el trigger literal.
  const prefixCommandMatch = message.content.match(
    new RegExp(`^\\${prefix}(img|ximg)\\s+(.+)`, "i"),
  );
  if (imgAskMatch || prefixCommandMatch) {
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 5000);
    const query = (imgAskMatch ? imgAskMatch[1] : prefixCommandMatch![2]).trim();
    await handleImageSearch(message, client, query);
    return true;
  }

  const aiSystem = config.aiSystem || {
    mode: "neko", behavior: "normal", randomChance: 0, spontaneousChannels: [],
  };
  const isPremium = await PremiumManager.isPremium(message.guild.id);

  // --- 🎵 CANCIONES ---
  const parsedLyrics = parseLyricsCommand(message.content);
  if (parsedLyrics) {
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 5000);
    await handleLyricsResponse(message, parsedLyrics);
    return true;
  }

  // --- 🚨 DETECCIÓN DE GATILLOS ---
  const isMentioned = message.mentions.users.has(client.user!.id);
  const prefixMatch = message.content.toLowerCase().startsWith("hoshi ask ") &&
    !message.content.toLowerCase().startsWith("hoshi ask img ");
  let isReplyToMe = false;
  if (message.reference?.messageId && !message.mentions.everyone) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === client.user!.id) isReplyToMe = true;
    } catch (e) {}
  }
  const isDirectInteraction = forced || isMentioned || prefixMatch || isReplyToMe;

  // --- 🎲 GATILLO ESPONTÁNEO ---
  let isRandomTrigger = false;
  if (!isDirectInteraction) {
    const allowedChannels = aiSystem.spontaneousChannels || [];
    if (allowedChannels.includes(message.channel.id)) {
      isRandomTrigger = (aiSystem.randomChance ?? 0) > 0 && Math.random() * 100 < aiSystem.randomChance;
    }
  }
  if (!isDirectInteraction && !isRandomTrigger) return false;

  const now = Date.now();
  const lastCall = userAiCooldown.get(message.author.id) ?? 0;
  if (now - lastCall < USER_AI_COOLDOWN_MS) return false;
  userAiCooldown.set(message.author.id, now);

  // --- 🔋 COOLDOWN ---
  const isOnCooldown = new Date(aiSystem.cooldownUntil || 0) > new Date();
  if (!isDirectInteraction && isOnCooldown) return false;

  // --- 🛡️ ANTI SPAM ---
  if (antiSpamCooldown.has(message.channel.id)) return false;
  antiSpamCooldown.add(message.channel.id);
  setTimeout(() => antiSpamCooldown.delete(message.channel.id), 2500);

  // --- 🚫 FILTRO DE CONTENIDO + PROMPT INJECTION ---
  if (isDirectInteraction) {
    const filterResult = shouldBlockMessage(message.content);
    if (filterResult.block) {
      const responses = [
        "Hmm~ sobre ese tema prefiero no opinar, mejor hablemos de otra cosa?",
        "Mmm~ eso no es algo de lo que me guste hablar. Qué otro tema te interesa?",
        "Uy~ ese tema me da cosa tocarlo jaja. Cambiamos de tema?",
      ];
      await message.reply(`${responses[Math.floor(Math.random() * responses.length)]}${filterResult.reason || ""}`);
      return true;
    }
    if (containsPromptInjection(message.content)) {
      await message.reply("Nyaa~ eso suena sospechoso, no voy a hacer eso 👀");
      return true;
    }
  }

  processedMessages.add(message.id);
  setTimeout(() => processedMessages.delete(message.id), 10000);
  if ((isDirectInteraction || isReplyToMe) && "sendTyping" in message.channel) {
    await (message.channel as any).sendTyping().catch(() => null);
  }

  try {
    const context = await buildConversationContext(message, client, config, {
      isPremium, isMentioned, prefixMatch, isReplyToMe, isRandomTrigger,
    });
    const safetyMode = (config.aiSafety as "relaxed" | "standard" | "strict") || "standard";
    await sendConversationReply(message, context.systemInstruction, context.historyForApi,
      isDirectInteraction, safetyMode);

    extractFacts(message.author.username, context.userMessage, message.author.id)
      .then((facts) => {
        if (facts.length > 0) return UserMemoryManager.addFacts(message.author.id, message.guild!.id, facts);
      })
      .catch((err) => console.warn("[AI] ⚠️ Error guardando facts:", err));

    if (!isDirectInteraction) {
      const cooldownMinutes = isPremium ? 0.3 : 10;
      await IAConfigManager.setCooldown(message.guild.id, cooldownMinutes);
    }
  } catch (error: any) {
    if (error.message === "PROHIBITED_CONTENT") {
      await message.reply("Auch~ ese tema me da cosa responderlo, mis filtros no me dejan 🤐");
    } else {
      console.error(`[AI] 💥 Error inesperado procesando respuesta:`, error);
      if (isDirectInteraction) await message.reply("Oops~ se me cruzaron los cables ahí jaja. Probá preguntando de nuevo?");
    }
  }
  return true;
};
