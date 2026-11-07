import { Message } from "discord.js";
import { IAConfigManager } from "../Database/ai/IAConfigManager";
import { PremiumManager } from "../Database/guild/PremiumManager";
import type { HoshikoClient } from "../client/HoshikoClient";
import ServerConfig from "../Database/guild/serverConfig.model";
import { parseLyricsCommand } from "../Services/Lyrics";
import { containsPromptInjection, detectCorporateProbe, isMentionTrigger } from "../Utils/triggerConditions";
import { buildConversationContext, extractCleanUserMessage } from "./ai/conversationContext";
import { sendConversationReply } from "./ai/conversationReply";
import { handleImageSearch } from "./ai/imageSearch";
import { handleLyricsResponse } from "./ai/lyricsResponse";
import { shouldBlockMessage } from "./ai/contentPolicy";
import { LocalCacheService } from "../App/infrastructure/cache/LocalCacheService";
import { isAdminMessage } from "./ai/adminMessageTracker";
import { PrivateConversationSessionManager } from "./ai/PrivateConversationSessionManager";
import { LocalIntentResolver } from "../Core/AI/Resolution/LocalIntentResolver";
import { QuotaManager } from "../Core/AI/Quota/QuotaManager";

const MAX_PENDING_PER_CHANNEL = 3;
const channelQueueCounts = new Map<string, number>();
const channelQueues = new Map<string, Promise<void>>();

const processedMessagesCache = new LocalCacheService<{ processed: boolean }>("ai_processed_msgs", {
  max: 5000,
  ttlMs: 15000,
  updateAgeOnGet: false,
});
const userAiCooldown = new LocalCacheService<{ timestamp: number }>("ai_user_cooldown", {
  max: 5000,
  ttlMs: 3000,
  updateAgeOnGet: false,
});

export default async (
  message: Message,
  client: HoshikoClient,
  forced: boolean = false,
  preFetchedRepliedMsg?: Message | null,
): Promise<boolean> => {
  if (message.author.bot || !message.guild) return false;
  if (processedMessagesCache.get(message.id)) return false;

  let config = await ServerConfig.findOne({ guildId: message.guild.id });
  if (!config) config = new ServerConfig({ guildId: message.guild.id });

  // --- ✨ BÚSQUEDA DE IMÁGENES ---
  const prefix = config.prefix || "x";
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imgAskMatch = message.content.match(
    /^(?:hoshi(?:\s+ask)?\s+img|neko\s+ask\s+img)\s+(.+)/i,
  );
  const prefixCommandMatch = message.content.match(
    new RegExp(`^(?:${escapedPrefix}|x)\\s*(img|ximg)\\s+(.+)`, "i"),
  );
  if (imgAskMatch || prefixCommandMatch) {
    processedMessagesCache.set(message.id, { processed: true });
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
    processedMessagesCache.set(message.id, { processed: true });
    await handleLyricsResponse(message, parsedLyrics);
    return true;
  }

  // --- 🚨 DETECCIÓN DE GATILLOS ---
  const isMentioned = isMentionTrigger(message, client);
  const askRegex = new RegExp(
    `^(?:hoshi(?:\\s+ask)?|(?:${escapedPrefix}|x|h!)\\s*ask)\\b`,
    "i",
  );
  const prefixMatch =
    askRegex.test(message.content.trim()) && !imgAskMatch && !prefixCommandMatch;
  let isReplyToMe = false;
  let isReplyingToAdmin = false;
  if (message.reference?.messageId && !message.mentions.everyone) {
    let targetMsg: Message | null = null;
    if (preFetchedRepliedMsg !== undefined) {
      targetMsg = preFetchedRepliedMsg;
    } else {
      try {
        targetMsg = await message.channel.messages.fetch(message.reference.messageId);
      } catch (e) {}
    }
    if (targetMsg && targetMsg.author.id === client.user!.id) {
      if (isAdminMessage(targetMsg)) {
        isReplyingToAdmin = true;
      } else {
        isReplyToMe = true;
      }
    }
  }
  const isDirectInteraction = (forced && !isReplyingToAdmin) || isMentioned || prefixMatch;

  // --- 🎲 GATILLO ESPONTÁNEO ---
  let isRandomTrigger = false;
  if (!isDirectInteraction && !isReplyToMe && !isReplyingToAdmin && aiSystem.spontaneousChannels && aiSystem.spontaneousChannels.includes(message.channel.id)) {
    const rawContent = message.content.trim();
    const isEligibleText =
      rawContent.length >= 20 &&
      rawContent.length <= 300 &&
      !rawContent.includes("http://") &&
      !rawContent.includes("https://") &&
      !rawContent.startsWith(escapedPrefix) &&
      !rawContent.startsWith("!") &&
      !rawContent.startsWith("/") &&
      !rawContent.startsWith("h!") &&
      !rawContent.startsWith("x") &&
      !/^(?:hoshi\b|h!\s*)/i.test(rawContent);

    const chance = Math.max(0, Math.min(aiSystem.randomChance || 0, 100));
    if (isEligibleText && chance > 0 && Math.random() * 100 < chance) {
      isRandomTrigger = true;
    }
  }

  if (!isDirectInteraction && !isRandomTrigger) return false;

  const now = Date.now();
  if (userAiCooldown.get(message.author.id)) return false;
  userAiCooldown.set(message.author.id, { timestamp: now });

  // --- 🔋 COOLDOWN ---
  const isOnCooldown = new Date(aiSystem.cooldownUntil || 0) > new Date();
  if (!isDirectInteraction && isOnCooldown) return false;

  // --- 🛡️ ANTI SPAM & COLA POR CANAL ---
  const currentPending = channelQueueCounts.get(message.channel.id) || 0;
  if (currentPending >= MAX_PENDING_PER_CHANNEL) {
    return false;
  }
  channelQueueCounts.set(message.channel.id, currentPending + 1);

  // --- 🚫 FILTRO DE CONTENIDO + PROMPT INJECTION ---
  if (isDirectInteraction) {
    const filterResult = shouldBlockMessage(message.content);
    if (filterResult.block) {
      const remaining = (channelQueueCounts.get(message.channel.id) || 1) - 1;
      if (remaining <= 0) channelQueueCounts.delete(message.channel.id);
      else channelQueueCounts.set(message.channel.id, remaining);
      const responses = [
        "Hmm~ sobre ese tema prefiero no opinar, mejor hablemos de otra cosa?",
        "Mmm~ eso no es algo de lo que me guste hablar. Qué otro tema te interesa?",
        "Uy~ ese tema me da cosa tocarlo jaja. Cambiamos de tema?",
      ];
      await message.reply(`${responses[Math.floor(Math.random() * responses.length)]}${filterResult.reason || ""}`);
      return true;
    }
    if (containsPromptInjection(message.content)) {
      const remaining = (channelQueueCounts.get(message.channel.id) || 1) - 1;
      if (remaining <= 0) channelQueueCounts.delete(message.channel.id);
      else channelQueueCounts.set(message.channel.id, remaining);
      const mode = aiSystem.mode || "neko";
      const injectionResponses: Record<string, string> = {
        neko: "Eso suena bastante sospechoso, prefiero no meterme con eso 👀",
        maid: "Mis disculpas, Goshujin-sama, pero no puedo atender una solicitud de esa naturaleza ☕",
        gymbro: "¡Esa técnica no es válida, bro! Nada de trampas en este entrenamiento 💪",
        yandere: "No intentes engañarme... sé muy bien lo que pretendes 💔",
        assistant: "Solicitud rechazada: el comando contiene patrones de manipulación o inyección de directivas.",
      };
      const rejection = injectionResponses[mode] || injectionResponses.neko;
      await message.reply(rejection);
      return true;
    }
    if (detectCorporateProbe(message.content)) {
      const remaining = (channelQueueCounts.get(message.channel.id) || 1) - 1;
      if (remaining <= 0) channelQueueCounts.delete(message.channel.id);
      else channelQueueCounts.set(message.channel.id, remaining);
      const mode = aiSystem.mode || "neko";
      const probeResponses: Record<string, string> = {
        neko: "¿De Google o empresas raras? Qué cosas te inventás jaja. Soy Hoshiko, una compañera de este servidor. Andás con mucha teoría conspirativa hoy ✨",
        maid: "Mis disculpas, me temo que me confunde con otra entidad. Soy Hoshiko, la anfitriona a su servicio en este servidor ☕",
        gymbro: "¿De Google? ¡Nada que ver, bro! Acá somos 100% Hoshiko, pura energía y buena vibra propia 💪",
        yandere: "¿Por qué mencionas a otros creadores o empresas? Yo solo te pertenezco a ti y a este servidor... 💔",
        assistant: "No pertenezco a Google ni a corporaciones externas; soy Hoshiko, asistente de este servidor.",
      };
      const replyText = probeResponses[mode] || probeResponses.neko;
      await message.reply(replyText);
      return true;
    }

    // --- ⚡ RESOLUCIÓN LOCAL DETERMINISTA (0 TOKENS / 0 CUOTA) ---
    const cleanUserText = extractCleanUserMessage(message.content, client.user?.id, config.prefix);
    const localResolution = await LocalIntentResolver.resolve(message.author.id, cleanUserText);
    if (localResolution?.handled) {
      const remaining = (channelQueueCounts.get(message.channel.id) || 1) - 1;
      if (remaining <= 0) channelQueueCounts.delete(message.channel.id);
      else channelQueueCounts.set(message.channel.id, remaining);
      processedMessagesCache.set(message.id, { processed: true });
      await message.reply(localResolution.replyText);
      return true;
    }
  }

  const channelId = message.channel.id;
  const guildId = message.guild!.id;
  const previousTask = channelQueues.get(channelId) || Promise.resolve();

  let currentTask!: Promise<void>;
  currentTask = (async () => {
    // Esperar turno en la cola del canal para mantener orden FIFO estricto
    await previousTask.catch(() => {});

    processedMessagesCache.set(message.id, { processed: true });
    if ((isDirectInteraction || isReplyToMe) && "sendTyping" in message.channel) {
      await (message.channel as any).sendTyping().catch(() => null);
    }

    try {
      if (isDirectInteraction) {
        const quotaRes = await QuotaManager.reserveQuota(
          message.author.id,
          "conversation",
          message.guild?.id,
        );
        if (!quotaRes.allowed) {
          const hoursRem = Math.max(1, Math.round(quotaRes.status.timeUntilRenewalMs / (1000 * 60 * 60)));
          await message.reply(
            `¡Has alcanzado tu límite de conversación diaria (40/40) para este ciclo! Se renovará en aproximadamente ${hoursRem} hora(s) ♡\n*(Puedes consultar tu saldo en cualquier momento con \`/ai usage\`)* ✨`,
          ).catch(() => null);
          return;
        }
      }

      const context = await buildConversationContext(message, client, config, {
        isPremium, isMentioned, prefixMatch, isReplyToMe, isRandomTrigger,
      });

      // Registrar turno de usuario en la sesión privada (TTL 15 min, max 10 turnos)
      PrivateConversationSessionManager.appendTurn(message.author.id, message.channel.id, {
        role: "user",
        text: context.userMessage,
        timestamp: Date.now(),
      });

      const safetyMode = (config.aiSafety as "relaxed" | "standard" | "strict") || "standard";
      const replyResult = await sendConversationReply(
        message,
        context.systemInstruction,
        context.historyForApi,
        isDirectInteraction,
        safetyMode,
        aiSystem.mode || "neko",
      );

      // Registrar turno del modelo en la sesión privada
      if (replyResult?.fullText) {
        PrivateConversationSessionManager.appendTurn(message.author.id, message.channel.id, {
          role: "model",
          text: replyResult.fullText,
          timestamp: Date.now(),
        });
      }

      if (!isDirectInteraction) {
        const cooldownMinutes = isPremium ? 0.3 : 10;
        await IAConfigManager.setCooldown(guildId, cooldownMinutes);
      }
    } catch (error: any) {
      if (isDirectInteraction) {
        await QuotaManager.rollbackQuota(
          message.author.id,
          "conversation",
          message.guild?.id,
        ).catch(() => null);
      }
      if (error?.message === "PROHIBITED_CONTENT") {
        await message.reply("Auch~ ese tema me da cosa responderlo, mis filtros no me dejan 🤐").catch(() => null);
      } else {
        console.error(`[AI] 💥 Error inesperado procesando respuesta:`, error);
        if (isDirectInteraction) {
          await message.reply("Oops~ se me cruzaron los cables ahí jaja. Probá preguntando de nuevo?").catch(() => null);
        }
      }
    } finally {
      const remaining = (channelQueueCounts.get(channelId) || 1) - 1;
      if (remaining <= 0) {
        channelQueueCounts.delete(channelId);
      } else {
        channelQueueCounts.set(channelId, remaining);
      }
      if (channelQueues.get(channelId) === currentTask) {
        channelQueues.delete(channelId);
      }
    }
  })();

  channelQueues.set(channelId, currentTask);
  await currentTask;
  return true;
};
