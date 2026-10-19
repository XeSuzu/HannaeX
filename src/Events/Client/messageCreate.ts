import { Events, Message } from "discord.js";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import {
  checkReplyingToBot,
  hasCommandArguments,
  isCommandPassthrough,
  isHoshiPrefix,
  isMentionTrigger,
} from "../../Utils/triggerConditions";
import { HoshikoClient } from "../../index";
import {
  handleTextMessageAfk,
  handleTextMessageSnipe,
} from "../../Features/messageTextCommands";

// Features
import handleAfk from "../../Features/afkHandler";
import handleAi from "../../Features/aiHandler";
import { handleCulture } from "../../Features/cultureHandler";
import { handleLevelXp } from "../../Features/levelHandler";
import { handleLinkProtection } from "../../Features/linkProtector";
// Security
import { AutomodManager } from "../../Features/AutomodManager";
import { evaluateHighStressMessage } from "../../Features/automod/aiModeration";
import {
  markTextActivity,
  rememberDeletedMessage,
} from "../../Features/automod/automodState";
import { Blacklist } from "../../Security/Defense/Blacklist";
import { RateLimiter } from "../../Security/Defense/RateLimiter";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { isOverloaded } from "../../Utils/loadShedding";

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: HoshikoClient) {
    if (message.author.bot || !message.guild) return;

    try {
      if (Blacklist.isBlocked(message.author.id)) return;

      type LiteSettings = {
        prefix?: string;
        aiModule?: { enabled: boolean };
        securityModules?: any;
        allowedLinks?: string[];
      };

      const settings = (await SettingsManager.getLite(
        message.guild.id,
        "prefix aiModule securityModules allowedLinks",
      )) as LiteSettings | null;

      markTextActivity(message.guild.id, message.author.id);

      // 1. Entropía de Acción: Cross-Channel Spam (mismo mensaje/archivo en 3+ canales en <12s)
      if (message.member && settings?.securityModules?.antiSpam) {
        const xChanAction = await AutomodManager.checkCrossChannel(
          message.guild,
          message.author.id,
          message.channel.id,
          message.content,
          message.attachments.map((a) => a.size),
        );
        if (xChanAction) {
          rememberDeletedMessage(
            message.guild.id,
            message.author.id,
            message.channel.id,
            message.content,
          );
          await message.delete().catch(() => null);
          await AutomodManager.executeAction(
            message.guild,
            message.member,
            xChanAction,
            "CrossChannelSpam",
          );
          await HoshikoLogger.sendLog(
            message.guild,
            "AUTOMOD",
            `🚨 **Cross-Channel Spam detectado:** <@${message.author.id}> envió el mismo mensaje en múltiples canales simultáneamente.\n**Extracto:** \`${message.content.slice(0, 100) || "(solo adjuntos)"}\``,
            message.author,
          );
          return;
        }
      }

      // 2. Spam check clásico por frecuencia
      if (message.member && settings?.securityModules?.antiSpam) {
        const spamAction = await AutomodManager.checkSpam(
          message.guild,
          message.author.id,
        );
        if (spamAction) {
          await AutomodManager.executeAction(
            message.guild,
            message.member,
            spamAction,
            "MessageSpam",
          );
          await message
            .reply("🌸 ¡Oye! Vas muy rápido. Descansa un momento.")
            .catch(() => null);
          return;
        }
      }

      if (RateLimiter.isSpamming(message.author.id)) {
        Blacklist.add(message.author.id, "Spam excesivo", "TEMPORAL", 15);
        return;
      }

      if (settings && (await handleLinkProtection(message, settings))) return;

      // 3. Moderación IA Asistida (Solo se activa si el Medidor de Estrés supera el umbral del servidor)
      void evaluateHighStressMessage(
        message,
        settings?.securityModules?.securityLevel ?? 2,
      );

      // ─── Fase 3: Detección de prefix y comandos ───────────────────────────
      const currentPrefix = settings?.prefix || "x";
      const validPrefixes = [currentPrefix, "x", "hoshi ", "h! "];
      const lowerMessage = message.content.toLowerCase();
      const matchedPrefix = validPrefixes.find((p) =>
        lowerMessage.startsWith(p.toLowerCase()),
      );
      const prefix = matchedPrefix
        ? message.content.slice(0, matchedPrefix.length)
        : undefined;

      let isHoshiCall = false;

      if (prefix) {
        const contentAfterPrefix = message.content.slice(prefix.length).trim();
        if (!contentAfterPrefix) return;

        const args = contentAfterPrefix.split(/ +/g);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const prefixIsHoshi = isHoshiPrefix(prefix);

        if (commandName === "snipe") {
          await handleTextMessageSnipe(message, args);
          return;
        }
        if (commandName === "afk") {
          await handleTextMessageAfk(message, args);
          return;
        }

        // Permitir que xask / x ask / ximg / x img / hoshi ask / hoshi img pasen a aiHandler
        if (commandName === "ximg" || isCommandPassthrough(commandName)) {
          isHoshiCall = true;
        } else {
          const command =
            client.commands.get(commandName) ||
            client.commands.find(
              (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
            );

          if (command) {
            try {
              if (command.prefixRun) {
                await command.prefixRun(client, message, args);
              } else if (command.execute && !("data" in command)) {
                await command.execute(message, args, client);
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              console.error(
                `💥 Error en comando texto ${commandName}:`,
                errorMsg,
              );
            }
            return;
          }

          // Si usó "hoshi <mensaje>" y no es un comando registrado, pásalo a la IA
          if (prefixIsHoshi) {
            isHoshiCall = true;
          } else {
            return;
          }
        }
      } else {
        // ✅ FIX #3 — triggers unificados con los que usa aiHandler
        const lowerContent = message.content.toLowerCase();
        if (
          lowerContent === "hoshi" ||
          lowerContent === "hoshi ask" ||
          lowerContent.startsWith("hoshi ask ") ||
          lowerContent.startsWith("neko ask img ")
        ) {
          isHoshiCall = true;
        }
      }

      // ─── Fase 4: Features ─────────────────────────────────────────────────
      await handleCulture(message);
      if (!isHoshiCall && (await handleAfk(message))) return;
      if (!isOverloaded()) await handleLevelXp(message);

      // ─── Fase 5: Módulo IA ────────────────────────────────────────────────
      const isAiEnabled = settings?.aiModule?.enabled !== false;
      if (!isAiEnabled) return;

      const isMentioned = isMentionTrigger(message, client);
      const isReplyingToMe = await checkReplyingToBot(message, client);

      const isDirect = isMentioned || isReplyingToMe || isHoshiCall;

      // ✅ FIX #2 — pasar isDirect como forced para que gatillos espontáneos funcionen
      await handleAi(message, client, isDirect);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("💥 Error crítico en messageCreate:", errorMessage);
    }
  },
};
