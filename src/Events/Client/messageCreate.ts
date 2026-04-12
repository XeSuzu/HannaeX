import { EmbedBuilder, Events, Message, PermissionsBitField } from "discord.js";
import { SettingsManager } from "../../Database/SettingsManager";
import { Snipe } from "../../Models/Snipe";
import AFK from "../../Models/afk";
import {
  checkReplyingToBot,
  hasCommandArguments,
  isCommandPassthrough,
  isHoshiAsk,
  isHoshiPrefix,
  isImgCommand,
  isMentionTrigger,
} from "../../Utils/triggerConditions";
import { HoshikoClient } from "../../index";

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
import { Sanitizer } from "../../Security/Defense/Sanitizer";

async function handleTextMessageSnipe(message: Message, args: string[]) {
  if (!message.guildId) return;

  const settings = await SettingsManager.getSettings(message.guildId);
  if (!settings?.securityModules?.snipe) {
    await message.reply(
      "❌ El comando snipe está desactivado en este servidor. Un administrador puede activarlo con `/setup`.",
    );
    return;
  }

  const position = args[0] ? parseInt(args[0]) : 1;
  if (isNaN(position) || position < 1 || position > 10) {
    await message.reply("❌ El número debe ser entre 1 y 10.");
    return;
  }
  const index = position - 1;

  const doc = await Snipe.findOne({ channelId: message.channelId });

  if (!doc || !doc.snipes.length || !doc.snipes[index]) {
    await message.reply(
      index === 0
        ? "Nyaa~ no hay mensajes borrados recientes en este canal. 🧹"
        : `Solo tengo guardados **${doc?.snipes.length || 0}** mensajes borrados aquí.`,
    );
    return;
  }

  const msg = doc.snipes[index];
  const embed = new EmbedBuilder()
    .setColor("Random")
    .setAuthor({ name: `${msg.author} borró esto:`, iconURL: msg.authorAvatar })
    .setDescription(msg.content)
    .setFooter({
      text: `Snipe ${position}/${doc.snipes.length} • Hoshiko 🐾 • Expira en 1h`,
    })
    .setTimestamp(msg.deletedAt);

  if (msg.image) embed.setImage(msg.image);
  await message.reply({ embeds: [embed] });
}

async function handleTextMessageAfk(message: Message, args: string[]) {
  if (!message.guild || !message.member) {
    await message.reply("❌ Este comando solo funciona en un servidor.");
    return;
  }

  const reason = args.join(" ") || "Estoy ausente 🐾";
  let currentNickname = message.member.displayName;

  if (currentNickname.startsWith("[AFK] ")) {
    currentNickname = currentNickname.replace("[AFK] ", "");
  }

  const originalNickname = currentNickname;
  let nicknameChanged = false;

  if (message.member.id !== message.guild.ownerId) {
    const botMember = await message.guild.members.fetchMe();
    const hasPerms = botMember.permissions.has(
      PermissionsBitField.Flags.ManageNicknames,
    );
    const canChange =
      hasPerms &&
      botMember.roles.highest.position > message.member.roles.highest.position;

    if (canChange && !message.member.displayName.startsWith("[AFK] ")) {
      try {
        const newNickname = `[AFK] ${originalNickname}`.substring(0, 32);
        await message.member.setNickname(newNickname);
        nicknameChanged = true;
      } catch (error) {
        console.warn(`[AFK] No pude cambiar apodo a ${message.author.tag}`);
      }
    }
  }

  try {
    await AFK.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { reason, timestamp: new Date(), originalNickname },
      { upsert: true, new: true },
    );
  } catch (dbError) {
    console.error("[AFK] Error DB:", dbError);
    await message.reply("❌ Error al guardar tu estado AFK.");
    return;
  }

  const unixTimestamp = Math.floor(Date.now() / 1000);
  const embed = new EmbedBuilder()
    .setColor(0xffc0cb)
    .setTitle("🌙 Te has marcado como ausente")
    .setAuthor({
      name: `${message.author.username} ahora está AFK`,
      iconURL: message.author.displayAvatarURL(),
    })
    .addFields(
      { name: "Razón", value: `> ${reason}` },
      { name: "Ausente desde", value: `> <t:${unixTimestamp}:R>` },
    )
    .setFooter({ text: "Un pequeño descanso... 🐱💗" });

  if (nicknameChanged) {
    embed.addFields({
      name: "Apodo",
      value: "> He actualizado tu apodo a `[AFK]`.",
    });
  }

  await message.reply({ embeds: [embed] });
}

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

        // Comandos especiales — se manejan antes de buscar en el registro
        if (commandName === "snipe") {
          await handleTextMessageSnipe(message, args);
          return;
        }
        if (commandName === "afk") {
          await handleTextMessageAfk(message, args);
          return;
        }

        // Si el prefix es hoshi y el comando es passthrough (ask/img) con args → IA
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
          // Comando no encontrado → ignorar
          return;
        }
      } else {
        // Sin prefix — solo "hoshi ask" o "hoshi img" activan la IA
        const lowerContent = message.content.toLowerCase();
        if (
          lowerContent.startsWith("hoshi ask ") ||
          lowerContent.startsWith("hoshi img ")
        ) {
          isHoshiCall = true;
        }
      }

      // ─── Fase 4: Features (solo si no hay prefix de comando) ─────────────
      Sanitizer.clean(message.content);
      await handleCulture(message);
      if (!isHoshiCall && (await handleAfk(message))) return;
      await handleLevelXp(message);

      // ─── Fase 5: Módulo IA ────────────────────────────────────────────────
      const isAiEnabled = settings?.aiModule?.enabled !== false;
      if (!isAiEnabled) return;

      const isMentioned = isMentionTrigger(message, client);
      const isReplyingToMe = await checkReplyingToBot(message, client);
      const isImgTrigger = isImgCommand(message);
      const isAskTrigger = isHoshiAsk(message);

      const isDirect =
        isMentioned ||
        isReplyingToMe ||
        isHoshiCall ||
        isImgTrigger ||
        isAskTrigger;

      if (isDirect) {
        await handleAi(message, client, true);
      } else {
        if (Math.random() < 0.02) await handleAi(message, client, false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("💥 Error crítico en messageCreate:", errorMessage);
    }
  },
};
