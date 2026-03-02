import { Events, Message, EmbedBuilder, MessageFlags, PermissionsBitField } from "discord.js";
import { HoshikoClient } from "../../index";
import { SettingsManager } from "../../Database/SettingsManager";
import { Snipe } from "../../Models/Snipe";
import AFK from "../../Models/afk";

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

// Handler para comando snipe de texto
async function handleTextMessageSnipe(message: Message, args: string[]) {
  if (!message.guildId) return;

  // 1. Verificar si snipe está habilitado en el servidor
  const settings = await SettingsManager.getSettings(message.guildId);
  if (!settings?.securityModules?.snipe) {
    await message.reply("❌ El comando snipe está desactivado en este servidor. Un administrador puede activarlo con `/setup`.");
    return;
  }

  // 2. Buscar mensaje borrado
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
        : `Solo tengo guardados **${doc?.snipes.length || 0}** mensajes borrados aquí.`
    );
    return;
  }

  // 3. Construir y enviar la respuesta pública
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

// Handler para comando AFK de texto
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

  // Cambiar apodo si es posible
  if (message.member.id !== message.guild.ownerId) {
    const botMember = await message.guild.members.fetchMe();
    const hasPerms = botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames);
    const canChange = hasPerms && botMember.roles.highest.position > message.member.roles.highest.position;

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

  // Guardar en base de datos
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
            // Manejar comando snipe de texto específicamente
            if (commandName === 'snipe') {
              await handleTextMessageSnipe(message, args);
              return;
            }

            // Manejar comando afk de texto específicamente
            if (commandName === 'afk') {
              await handleTextMessageAfk(message, args);
              return;
            }

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
