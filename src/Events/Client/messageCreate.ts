import { Events, Message } from "discord.js";
import { HoshikoClient } from "../../index";
import { SettingsManager } from "../../Database/SettingsManager";

// Features
import handleAfk from "../../Features/afkHandler";
import handleMemes from "../../Features/memeHandler";
import handleAi from "../../Features/aiHandler";
import { handleCulture } from "../../Features/cultureHandler";
import { handleLinkProtection } from "../../Features/linkProtector";

// Security
import { Blacklist } from "../../Security/Defense/Blacklist";
import { RateLimiter } from "../../Security/Defense/RateLimiter";
import { Sanitizer } from "../../Security/Defense/Sanitizer";
import { AutomodManager } from "../../Features/AutomodManager";

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
        const spamAction = await AutomodManager.checkSpam(message.guild, message.author.id);
        if (spamAction) {
          await AutomodManager.executeAction(
            message.guild,
            message.member,
            spamAction,
            "MessageSpam",
          );
          await message.reply("🌸 ¡Oye! Vas muy rápido. Descansa un momento.").catch(() => null);
          return;
        }
      }

      if (RateLimiter.isSpamming(message.author.id)) {
        Blacklist.add(message.author.id, "Spam excesivo", "TEMPORAL", 15);
        return;
      }

      if (settings && (await handleLinkProtection(message, settings))) return;

      // Fase 3: detección y ejecución de comandos
      const currentPrefix = settings?.prefix || "x";
      const validPrefixes = [currentPrefix, "x", "hoshi ", "Hoshi ", "h! "];
      const prefix = validPrefixes.find((p) => message.content.startsWith(p));

      let isHoshiCall = false;

      if (prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (commandName) {
          const command =
            client.commands.get(commandName) ||
            client.slashCommands.get(commandName) ||
            client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

          if (command) {
            try {
              if (command.prefixRun) {
                await command.prefixRun(client, message, args);
              } else if (command.execute && !("data" in command)) {
                await command.execute(message, args, client);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`💥 Error en comando texto ${commandName}:`, errorMsg);
            }
            return;
          } else {
            if (prefix.toLowerCase().includes("hoshi")) isHoshiCall = true;
          }
        } else {
          if (prefix.toLowerCase().includes("hoshi")) isHoshiCall = true;
        }
      } else {
        if (message.content.toLowerCase().startsWith("hoshi")) isHoshiCall = true;
      }

      // Fase 4: features
      Sanitizer.clean(message.content);
      await handleCulture(message);
      if (await handleAfk(message)) return;
      if (await handleMemes(message)) return;

      // Fase 5: módulo IA
      const isAiEnabled = settings?.aiModule?.enabled !== false;
      if (!isAiEnabled) return;

      const isMentioned = message.mentions.has(client.user!.id);

      let isReplyingToMe = false;
      if (message.reference) {
        const repliedMsg = await message.channel.messages
          .fetch(message.reference.messageId!)
          .catch(() => null);
        if (repliedMsg?.author.id === client.user!.id) {
          isReplyingToMe = true;
        }
      }

      const isHoshiAsk = message.content.toLowerCase().startsWith("hoshi ask ");
      const isImgCommand =
        !!message.content.match(/^(?:hoshi ask img|neko ask img)\s+(.+)/i) ||
        !!message.content.match(new RegExp(`^x(img|ximg)\\s+(.+)`, "i"));

      const isDirect = isMentioned || isReplyingToMe || isHoshiCall || isImgCommand || isHoshiAsk;

      if (isDirect) {
        await handleAi(message, client, true);
      } else {
        // Espontáneo 2% probabilidad
        if (Math.random() < 0.02) await handleAi(message, client, false);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("💥 Error crítico en messageCreate:", errorMessage);
    }
  },
};
