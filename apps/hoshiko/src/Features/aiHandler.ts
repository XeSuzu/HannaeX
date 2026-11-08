import { Message } from "discord.js";
import { IAConfigManager } from "../Database/ai/IAConfigManager";
import { PremiumManager } from "../Database/guild/PremiumManager";
import type { HoshikoClient } from "../client/HoshikoClient";
import ServerConfig from "../Database/guild/serverConfig.model";
import { parseLyricsCommand } from "../Services/Lyrics";
import { containsPromptInjection, detectCorporateProbe, isMentionTrigger } from "../Utils/triggerConditions";
import { buildConversationContext, extractCleanUserMessage, shouldExtractFacts } from "./ai/conversationContext";
import { sendConversationReply } from "./ai/conversationReply";
import { handleImageSearch } from "./ai/imageSearch";
import { handleLyricsResponse } from "./ai/lyricsResponse";
import { shouldBlockMessage } from "./ai/contentPolicy";
import { LocalCacheService } from "../App/infrastructure/cache/LocalCacheService";
import { isAdminMessage, markAsAiMessage } from "./ai/adminMessageTracker";
import { PrivateConversationSessionManager } from "./ai/PrivateConversationSessionManager";
import { LocalIntentResolver } from "../Core/AI/Resolution/LocalIntentResolver";
import { QuotaManager } from "../Core/AI/Quota/QuotaManager";
import { QuotaType } from "../Core/AI/Quota/QuotaTypes";
import { ConversationStatusManager, type StatusPhraseType } from "../Core/AI/Status/ConversationStatusManager";
import { ServerEntityMemoryService } from "../Core/AI/Memory/ServerEntityMemoryService";
import { PersonalMemoryService } from "../Core/AI/Memory/PersonalMemoryService";
import { extractFacts } from "../Services/gemini";
import { KeywordIntentClassifier } from "../Core/AI/Keywords/KeywordIntentClassifier";

export function isResearchQuery(text: string): boolean {
  return KeywordIntentClassifier.isResearchQuery(text);
}

export function isFactualOrTechnicalQuery(text: string): boolean {
  if (!text) return false;
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const factualPatterns = [
    /\b(cuando nacio|en que an[oó]|en que fecha|fecha de fundacion|quien escribio|quien descubrio|quien invento)\b/i,
    /\b(cual es la capital|cual es la poblacion|cuantos habitantes|cual es el pais|cual es la velocidad)\b/i,
    /\b(codigo|funcion|algoritmo|regex|typescript|javascript|python|sql|html|css|docker|git)\b/i,
    /\b(explica la diferencia entre|que significa el concepto|definicion de|como se calcula)\b/i,
  ];
  return factualPatterns.some((regex) => regex.test(clean));
}

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

  // Guard: Si el mensaje invoca un comando de prefijo registrado (ej. hoshi pat, hoshi activity, xpat),
  // nunca debe ser interceptado por el handler de IA.
  const rawTrimmed = message.content.trim();
  const cmdPrefixMatch = rawTrimmed.match(
    new RegExp(`^(?:hoshi\\s+|h!\\s*|${escapedPrefix}\\s*|x\\s*)([a-z0-9_-]+)`, "i"),
  );
  if (cmdPrefixMatch) {
    const candidateCmd = cmdPrefixMatch[1].toLowerCase();
    const isAiPassthrough =
      candidateCmd === "ask" || candidateCmd === "img" || candidateCmd === "ximg";
    if (
      !isAiPassthrough &&
      (candidateCmd === "snipe" ||
        candidateCmd === "afk" ||
        Boolean(client.commands?.has(candidateCmd)))
    ) {
      return false;
    }
  }
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

    let reservedQuotaType: QuotaType | null = null;
    let enableSearch = false;
    let statusMessage: Message | null = null;

    try {
      if (isDirectInteraction) {
        const userCleanText = extractCleanUserMessage(message.content, client.user?.id, config.prefix);
        const status = await QuotaManager.getStatus(message.author.id, message.guild?.id);

        // Si ambas cuotas están agotadas para usuario normal
        if (status.bothExhausted) {
          const alreadyNotified = await QuotaManager.hasExhaustionNoticeBeenSent(
            message.author.id,
            message.guild?.id,
          );
          if (!alreadyNotified) {
            await QuotaManager.markExhaustionNoticeSent(
              message.author.id,
              message.guild?.id,
            );
            const exhaustEmbed = QuotaManager.createUsageEmbed(
              message.author.id,
              message.author.username,
              status,
              message.guild?.id,
              true, // isExhaustionNotice
            );
            await message.reply({ embeds: [exhaustEmbed] }).catch(() => null);
          }
          return;
        }

        const classification = KeywordIntentClassifier.classify(userCleanText);
        const isResearch = classification.isResearch;

        if (isResearch) {
          if (status.research.balance > 0 || status.isExempt) {
            const res = await QuotaManager.reserveQuota(
              message.author.id,
              "research",
              message.guild?.id,
            );
            if (res.allowed) {
              reservedQuotaType = "research";
              enableSearch = true;
            } else if (status.conversation.balance > 0) {
              // Si en carrera concurrente se agotó investigación, fallback a texto conversacional
              const convRes = await QuotaManager.reserveQuota(
                message.author.id,
                "conversation",
                message.guild?.id,
              );
              if (convRes.allowed) {
                reservedQuotaType = "conversation";
                enableSearch = false;
              } else {
                return;
              }
            } else {
              return;
            }
          } else if (status.conversation.balance > 0) {
            // Investigación agotada, pero conversación disponible -> fallback a texto puro
            const convRes = await QuotaManager.reserveQuota(
              message.author.id,
              "conversation",
              message.guild?.id,
            );
            if (convRes.allowed) {
              reservedQuotaType = "conversation";
              enableSearch = false;
            } else {
              return;
            }
          } else {
            return;
          }
        } else {
          // Conversación normal
          if (status.conversation.balance > 0 || status.isExempt) {
            const res = await QuotaManager.reserveQuota(
              message.author.id,
              "conversation",
              message.guild?.id,
            );
            if (!res.allowed) return;
            reservedQuotaType = "conversation";
            enableSearch = false;
          } else {
            // Conversación agotada pero investigación disponible
            await message.reply(
              `¡Has alcanzado tu límite diario de mensajes conversacionales (40/40)! Sin embargo, tu cuota de investigación (20 consultas) sigue activa si deseas realizar búsquedas o consultas informativas en tiempo real ✨`,
            ).catch(() => null);
            return;
          }
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
      const isFactual = isFactualOrTechnicalQuery(context.userMessage);
      const classification = KeywordIntentClassifier.classify(context.userMessage);
      const isResearchMode = classification.isResearch;
      const adaptiveTemperature =
        aiSystem.mode === "assistant" || isResearchMode || isFactual ? 0.2 : 0.7;

      let effectiveSystemInstruction = context.systemInstruction;
      if (classification.deductionHint) {
        effectiveSystemInstruction = `${context.systemInstruction}\n\n${classification.deductionHint}`;
      }

      // El embed de espera progresivo (ilusión del trabajo) y el retardo de 10s
      // SOLO se activan cuando la consulta requiere búsqueda web en vivo.
      // En charlas casuales o consultas resueltas con datos locales, responde de forma inmediata y ágil.
      const isSearchRequired = Boolean(enableSearch || isResearchMode);

      if (isDirectInteraction && isSearchRequired && "reply" in message && typeof message.reply === "function") {
        const statusEmbed = ConversationStatusManager.createProgressiveStatusEmbed(client.user, 0);
        statusMessage = (await message.reply({ embeds: [statusEmbed] }).catch(() => null)) as Message | null;
        if (statusMessage?.id) markAsAiMessage(statusMessage.id);
      }

      const replyResult = await sendConversationReply(
        message,
        effectiveSystemInstruction,
        context.historyForApi,
        isDirectInteraction,
        safetyMode,
        aiSystem.mode || "neko",
        enableSearch,
        adaptiveTemperature,
        statusMessage,
        isSearchRequired ? 10000 : 0,
        "research",
      );

      // Guardado automático en segundo plano de entidades del servidor
      if (message.guild) {
        const extracted = ServerEntityMemoryService.extractEntityFact(context.userMessage);
        if (extracted) {
          ServerEntityMemoryService.saveEntityFact(
            message.guild.id,
            extracted.entity,
            extracted.fact,
            message.author.id,
            message.author.username,
          ).catch(() => null);
        }
      }

      // Guardado automático en segundo plano de hechos y dinámicas personales del usuario
      if (shouldExtractFacts(context.userMessage)) {
        // Detección heurística directa de dinámicas de trato, bromas o humor
        if (/\b(h[aá]blame con|tr[aá]tame de|me gusta el sarcasmo|es joda|es una broma|sos re|bobo|tonta)\b/i.test(context.userMessage)) {
          const dynamicSummary = /sarcasmo/i.test(context.userMessage)
            ? "Tiene sentido del humor sarcástico y disfruta el trato con chicanas"
            : "Tiene dinámica de bromas informales y chicanas amigables";
          PersonalMemoryService.addAutoExtractedFact(message.author.id, dynamicSummary, "dynamic").catch(() => null);
        }

        extractFacts(message.author.username, context.userMessage, message.author.id)
          .then(async (facts) => {
            for (const f of facts) {
              const cat = /sarcasmo|humor|bromas|chicana|bobo|tonta/i.test(f) ? "dynamic" : "biography";
              await PersonalMemoryService.addAutoExtractedFact(message.author.id, f, cat).catch(() => null);
            }
          })
          .catch(() => null);
      }

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
      if (reservedQuotaType) {
        await QuotaManager.rollbackQuota(
          message.author.id,
          reservedQuotaType,
          message.guild?.id,
        ).catch(() => null);
      }
      if (error?.message === "PROHIBITED_CONTENT") {
        if (statusMessage && typeof (statusMessage as any).edit === "function") {
          await (statusMessage as any).edit({ content: "Auch~ ese tema me da cosa responderlo, mis filtros no me dejan 🤐", embeds: [] }).catch(() => null);
        } else {
          await message.reply("Auch~ ese tema me da cosa responderlo, mis filtros no me dejan 🤐").catch(() => null);
        }
      } else {
        console.error(`[AI] 💥 Error inesperado procesando respuesta:`, error);
        if (isDirectInteraction) {
          if (statusMessage && typeof (statusMessage as any).edit === "function") {
            await (statusMessage as any).edit({ content: "Oops~ se me cruzaron los cables ahí jaja. Probá preguntando de nuevo?", embeds: [] }).catch(() => null);
          } else {
            await message.reply("Oops~ se me cruzaron los cables ahí jaja. Probá preguntando de nuevo?").catch(() => null);
          }
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
