import { Events, Message, PermissionFlagsBits } from "discord.js";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import {
  checkReplyingToBot,
  resolveReplyingToBot,
  hasCommandArguments,
  isCommandPassthrough,
  isHoshiPrefix,
  isMentionTrigger,
} from "../../Utils/triggerConditions";
import type { HoshikoClient } from "../../client/HoshikoClient";
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
import { handleWordFilter } from "../../Features/automod/wordFilter";

// Security
import { AutomodManager } from "../../Features/AutomodManager";
import { evaluateHighStressMessage } from "../../Features/automod/aiModeration";
import {
  addServerStressSafe,
  evaluateMassMentions,
  isTextWall,
  markTextActivity,
  PROFILES,
  recordMessageOccurrenceSync,
  rememberDeletedMessage,
  resetRepeatedMessages,
} from "../../Features/automod/automodState";
import { Blacklist } from "../../Security/Defense/Blacklist";
import { RateLimiter } from "../../Security/Defense/RateLimiter";
import { HoshikoLogger } from "../../Security/Logger/HoshikoLogger";
import { isOverloaded } from "../../Utils/loadShedding";

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: HoshikoClient) {
    if (message.author.bot || !message.guild) return;

    // Registro síncrono previo a cualquier await (Principio 4.4)
    const attachmentSizes = message.attachments.map((a) => a.size);
    const occ = recordMessageOccurrenceSync(
      message.guild.id,
      message.author.id,
      message.id,
      message.channel.id,
      message.content,
      attachmentSizes,
    );

    try {
      if (Blacklist.isBlocked(message.author.id)) return;

      type LiteSettings = {
        prefix?: string;
        aiModule?: { enabled: boolean };
        securityModules?: any;
        allowedLinks?: string[];
        bannedWords?: string[];
        exemptChannels?: string[];
        exemptRoles?: string[];
      };

      const settings = (await SettingsManager.getLite(
        message.guild.id,
        "prefix aiModule securityModules allowedLinks bannedWords exemptChannels exemptRoles",
      )) as LiteSettings | null;

      markTextActivity(message.guild.id, message.author.id);

      const channelId = message.channel.id;
      const parentChannelId = (message.channel as any)?.parentId;
      const isChannelExempt =
        (settings?.exemptChannels || []).includes(channelId) ||
        (Boolean(parentChannelId) && (settings?.exemptChannels || []).includes(parentChannelId));

      const memberRoles = message.member?.roles?.cache;
      const hasExemptRole = memberRoles
        ? (settings?.exemptRoles || []).some((rId) => memberRoles.has(rId))
        : false;

      const isStaffOrExempt =
        message.member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
        message.member?.permissions.has(PermissionFlagsBits.ManageGuild) ||
        message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
        isChannelExempt ||
        hasExemptRole;

      // ─── 0. Piso de Reglas: Menciones, Muro de Texto y Mensajes Repetidos ───
      if (!isStaffOrExempt && settings?.securityModules?.antiSpam && message.member) {
        // [SEPARACIÓN ARQUITECTÓNICA]: Modo Raid desactivado en Hoshiko; delegado a apps/hoshiko-security.
        const isRaid = false;
        const hasMentionEveryone = message.member.permissions.has(
          PermissionFlagsBits.MentionEveryone,
        );
        const mentionRes = evaluateMassMentions(
          message.content,
          {
            everyone: message.mentions.everyone,
            usersCount: message.mentions.users.size,
            rolesCount: message.mentions.roles.size,
          },
          hasMentionEveryone,
          isRaid,
        );

        if (mentionRes?.triggered) {
          rememberDeletedMessage(
            message.guild.id,
            message.author.id,
            message.channel.id,
            message.content,
          );
          HoshikoLogger.markBotMessageDelete(message.id);
          await message.delete().catch(() => null);

          let timedOut = false;
          if (
            mentionRes.action === "delete+timeout" &&
            message.member.moderatable
          ) {
            await message.member
              .timeout(mentionRes.timeoutMs, mentionRes.reason)
              .catch(() => null);
            timedOut = true;
          }

          await addServerStressSafe(message.guild.id, message.author.id, isRaid ? 30 : 15);
          await HoshikoLogger.sendLog(
            message.guild,
            "AUTOMOD",
            `🚨 **Menciones no autorizadas:** <@${message.author.id}> disparó filtro de menciones (${mentionRes.type}).\n**Acción:** ${timedOut ? `Borrado + Timeout (${mentionRes.timeoutMs / 60000}m)` : "Borrado de mensaje"}\n**Extracto:** \`${message.content.slice(0, 100)}\``,
            message.author,
          );
          return;
        }

        // Muro de texto
        if (isTextWall(message.content)) {
          rememberDeletedMessage(
            message.guild.id,
            message.author.id,
            message.channel.id,
            message.content,
          );
          HoshikoLogger.markBotMessageDelete(message.id);
          await message.delete().catch(() => null);

          let timedOut = false;
          if (isRaid && message.member.moderatable) {
            await message.member
              .timeout(10 * 60_000, "Muro de texto durante alerta de raid")
              .catch(() => null);
            timedOut = true;
          }

          await addServerStressSafe(message.guild.id, message.author.id, isRaid ? 25 : 10);
          await HoshikoLogger.sendLog(
            message.guild,
            "AUTOMOD",
            `🚨 **Muro de texto detectado:** <@${message.author.id}> envió un mensaje con exceso de saltos o caracteres repetidos.\n**Acción:** ${timedOut ? "Borrado + Timeout 10m" : "Borrado"}\n**Extracto:** \`${message.content.slice(0, 100)}\``,
            message.author,
          );
          return;
        }

        // Repetición mono-cuenta (incluido el mismo canal)
        const profile = isRaid ? PROFILES.raid : PROFILES.normal;
        if (occ.count >= profile.repeat.deleteAt) {
          const now = Date.now();
          const toDelete = occ.occurrences.filter(
            (o) => now - o.timestamp < 14 * 86400_000,
          );

          const byChannel = new Map<string, string[]>();
          for (const item of toDelete) {
            const list = byChannel.get(item.channelId) || [];
            list.push(item.messageId);
            byChannel.set(item.channelId, list);
          }

          for (const [chId, msgIds] of byChannel) {
            for (const mId of msgIds) {
              HoshikoLogger.markBotMessageDelete(mId);
            }
            const ch = message.guild.channels.cache.get(chId);
            if (ch?.isTextBased()) {
              if (msgIds.length >= 2) {
                await (ch as any).bulkDelete(msgIds, true).catch(() => null);
              } else if (msgIds.length === 1) {
                const msg = await (ch as any).messages
                  .fetch(msgIds[0])
                  .catch(() => null);
                if (msg) await msg.delete().catch(() => null);
              }
            }
          }

          let timedOut = false;
          if (occ.count >= profile.repeat.timeoutAt && message.member.moderatable) {
            await message.member
              .timeout(
                profile.repeat.timeoutMs,
                `Mensajes repetidos (${occ.count} veces en modo ${isRaid ? "raid" : "normal"})`,
              )
              .catch(() => null);
            timedOut = true;
          }

          await addServerStressSafe(
            message.guild.id,
            message.author.id,
            isRaid ? 30 : 15,
          );
          resetRepeatedMessages(
            message.guild.id,
            message.author.id,
            occ.fingerprint!,
          );

          await HoshikoLogger.sendLog(
            message.guild,
            "AUTOMOD",
            `🚨 **Mensaje repetido detectado:** <@${message.author.id}> repitió el mismo contenido ${occ.count} veces.\n**Acción:** ${timedOut ? `Borrado + Timeout (${profile.repeat.timeoutMs / 60000}m)` : "Borrado masivo"}\n**Extracto:** \`${message.content.slice(0, 100)}\``,
            message.author,
          );
          return;
        }

        // [SEPARACIÓN ARQUITECTÓNICA]: Detección de copypasta coordinado de Raid desactivada en Hoshiko; delegada a apps/hoshiko-security.
      }

      // 1. Entropía de Acción: Cross-Channel Spam (mismo mensaje/archivo en 3+ canales en <12s)
      if (!isStaffOrExempt && settings?.securityModules?.antiSpam) {
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
          HoshikoLogger.markBotMessageDelete(message.id);
          await message.delete().catch(() => null);
          const actionExecuted = await AutomodManager.executeAction(
            message.guild,
            message.member!,
            xChanAction,
            "CrossChannelSpam",
          );
          if (!actionExecuted) {
            await HoshikoLogger.sendLog(
              message.guild,
              "AUTOMOD",
              `🚨 **Cross-Channel Spam detectado:** <@${message.author.id}> envió el mismo mensaje en múltiples canales simultáneamente.\n**Acción:** Mensaje eliminado\n**Extracto:** \`${message.content.slice(0, 100) || "(solo adjuntos)"}\``,
              message.author,
            );
          }
          return;
        }
      }

      // 2. Spam check clásico por frecuencia
      if (!isStaffOrExempt && settings?.securityModules?.antiSpam) {
        const spamAction = await AutomodManager.checkSpam(
          message.guild,
          message.author.id,
        );
        if (spamAction) {
          HoshikoLogger.markBotMessageDelete(message.id);
          await AutomodManager.executeAction(
            message.guild,
            message.member!,
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

      if (!isStaffOrExempt && settings && (await handleLinkProtection(message, settings))) return;
      if (!isStaffOrExempt && settings && (await handleWordFilter(message, settings))) return;

      // 3. Moderación IA Asistida (revisa mensajes y enruta detecciones a #message-review)
      if (!isStaffOrExempt) {
        void evaluateHighStressMessage(
          message,
          settings?.securityModules?.securityLevel ?? 2,
          settings,
        );
      }

      // ─── Fase 3: Detección de prefix y comandos ───────────────────────────
      const currentPrefix = settings?.prefix || "x";
      const validPrefixes = Array.from(
        new Set(["hoshi ", "h! ", "h!", currentPrefix, "x"]),
      ).sort((a, b) => b.length - a.length);
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

        // Ejecutar comandos registrados en client.commands (PrefixCmds + SlashCmds con prefixRun)
        if (
          commandName !== "ximg" &&
          !isCommandPassthrough(commandName) &&
          client.commands?.has(commandName)
        ) {
          const registeredCmd = client.commands.get(commandName);
          if (registeredCmd) {
            if (typeof registeredCmd.execute === "function") {
              await registeredCmd.execute(message, args, client);
            } else if (typeof registeredCmd.prefixRun === "function") {
              await registeredCmd.prefixRun(client, message, args);
            }
            return;
          }
        }

        // Permitir que xask / x ask / ximg / x img / hoshi ask / hoshi img pasen a aiHandler
        if (commandName === "ximg" || isCommandPassthrough(commandName)) {
          isHoshiCall = true;
        } else if (prefixIsHoshi) {
          const hasArgs = hasCommandArguments(message, prefix.length, commandName);
          if (hasArgs) {
            isHoshiCall = true;
          }
        }
      }

      // Prioridad 1: AFK check
      if (await handleAfk(message)) return;

      // Prioridad 2: Level XP
      await handleLevelXp(message);

      // Prioridad 3: Culture Handler
      await handleCulture(message);

      // Prioridad 4: IA Handler
      const isMention = isMentionTrigger(message, client);
      const { isReply, repliedMsg } = await resolveReplyingToBot(message, client);
      const isDirect = isMention || isHoshiCall;

      // 🛡️ Load Shedding: Si el bot está colapsado, ignoramos respuestas espontáneas
      if (!isDirect && isOverloaded()) return;

      await handleAi(message, client, isDirect, repliedMsg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("💥 Error crítico en messageCreate:", errorMessage);
    }
  },
};
