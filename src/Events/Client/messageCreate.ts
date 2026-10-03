import { Events, Message } from "discord.js";
import { SettingsManager } from "../../Database/SettingsManager";
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
import { Blacklist } from "../../Security/Defense/Blacklist";
import { RateLimiter } from "../../Security/Defense/RateLimiter";

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

      // Spam check
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

      // ─── Fase 3: Detección de prefix y comandos ───────────────────────────
      const currentPrefix = settings?.prefix || "x";
      const validPrefixes = [currentPrefix, "x", "hoshi ", "Hoshi ", "h! "];
      const prefix = validPrefixes.find((p) => message.content.startsWith(p));

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

        if (
          prefixIsHoshi &&
          isCommandPassthrough(commandName) &&
          hasCommandArguments(message, prefix.length, commandName)
        ) {
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
          return;
        }
      } else {
        // ✅ FIX #3 — triggers unificados con los que usa aiHandler
        const lowerContent = message.content.toLowerCase();
        if (
          lowerContent.startsWith("hoshi ask ") ||
          lowerContent.startsWith("neko ask img ")
        ) {
          isHoshiCall = true;
        }
      }

      // ─── Fase 4: Features ─────────────────────────────────────────────────
      await handleCulture(message);
      if (!isHoshiCall && (await handleAfk(message))) return;
      await handleLevelXp(message);

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
