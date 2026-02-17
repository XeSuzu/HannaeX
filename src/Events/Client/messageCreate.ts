import { Events, Message } from "discord.js";
import { HoshikoClient } from "../../index";
import { SettingsManager } from "../../Database/SettingsManager";

// Features
import handleAfk from "../../Features/afkHandler";
import handleMemes from "../../Features/memeHandler";
import handleAi from "../../Features/aiHandler";
import { handleCulture } from "../../Features/cultureHandler";
import { handleLinkProtection } from "../../Features/linkProtector";
import { InfractionManager } from "../../Features/InfractionManager";

// Security
import { Blacklist } from "../../Security/Defense/Blacklist";
import { RateLimiter } from "../../Security/Defense/RateLimiter";
import { Sanitizer } from "../../Security/Defense/Sanitizer";

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: HoshikoClient) {
    // 0. Ignoramos bots y mensajes fuera de servidores
    if (message.author.bot || !message.guild) return;

    try {
      // Fase 1: comprobaciones de seguridad rápidas (sin DB)
      if (Blacklist.isBlocked(message.author.id)) return;

      if (RateLimiter.isSpamming(message.author.id)) {
        Blacklist.add(message.author.id, "Spam excesivo", "TEMPORAL", 15);

        // Intentamos registrar infracción (fire & forget)
        if (message.member) {
          InfractionManager.addPoints(
            message.member,
            "Spam excesivo",
            message,
          ).catch(() => {});
        }
        return message.reply("🌸 ¡Oye! Vas muy rápido. Descansa 15 minutos.");
      }

      // Fase 2: carga optimizada de configuración (cache/lite)
      // Se usa `as any` para evitar fricciones de tipos en lectura ligera
      const settings = (await SettingsManager.getLite(
        message.guild.id,
        "prefix aiModule securityModules allowedLinks",
      )) as any;

      // Revisamos Links (Usamos la configuración ya cargada)
      if (settings && (await handleLinkProtection(message, settings))) return;

      // Fase 3: detección y ejecución de comandos por prefijo
      // Determina prefijos válidos y busca comando correspondiente
      const currentPrefix = settings?.prefix || "x";

      // 2. Lista de todos los activadores válidos
      // Agregamos 'x' explícitamente por seguridad, y los alias de Hoshi
      const validPrefixes = [currentPrefix, "x", "hoshi ", "Hoshi ", "h! "];

      // 3. Buscamos si el mensaje empieza con alguno
      const prefix = validPrefixes.find((p) => message.content.startsWith(p));

      if (prefix) {
        // Quitamos el prefijo y separamos argumentos
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (commandName) {
          // Buscamos comando (Legacy, Slash híbrido o Alias)
          const command =
            client.commands.get(commandName) ||
            client.slashCommands.get(commandName) ||
            client.commands.find(
              (cmd: any) => cmd.aliases && cmd.aliases.includes(commandName),
            );

          if (command) {
            try {
              // Ejecutamos
              if (command.prefixRun) {
                await command.prefixRun(client, message, args);
              } else if (command.execute && !command.data) {
                await command.execute(message, args, client);
              }
              // Si es Slash puro sin soporte de texto, no hacemos nada (o podrías poner un aviso)
            } catch (error) {
              console.error(`💥 Error en comando texto ${commandName}:`, error);
            }
            // 🛑 IMPORTANTE: Si fue un comando, NO seguimos a la IA.
            return;
          }
        }
      }

      // Fase 4: features (AFK, memes, cultura, etc.)
      Sanitizer.clean(message.content);
      await handleCulture(message); // Reacciones culturales rápidas
      if (await handleAfk(message)) return;
      if (await handleMemes(message)) return; // Auto-respuestas simples

      // Fase 5: módulo IA (solo si está activado en la configuración)

      // Solo entramos si hay configuración y el módulo está activo
      if (settings && settings.aiModule?.enabled) {
        // 2. ¿Me mencionaron directamente? (@Hoshiko)
        const isMentioned = message.mentions.users.has(client.user!.id);

        // 3. ¿Están respondiendo a un mensaje mío?
        let isReplyingToMe = false;
        if (message.reference) {
          const repliedMsg = await message.fetchReference().catch(() => null);
          if (repliedMsg && repliedMsg.author.id === client.user!.id) {
            isReplyingToMe = true;
          }
        }

        // 🧱 EL MURO: Si no me llaman ni me responden, no hago nada.
        if (isMentioned || isReplyingToMe) {
          await handleAi(message, client);
        }
      }
    } catch (err: any) {
      console.error("💥 Error crítico en messageCreate:", err.message);
    }
  },
};
