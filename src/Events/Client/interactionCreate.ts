import {
  Events,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Collection,
  MessageFlags,
  TextChannel,
  EmbedBuilder,
  WebhookClient,
} from "discord.js";
import { HoshikoClient } from "../../index";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { ConfessionManager } from "../../Features/ConfessionManager";
import { SettingsManager } from "../../Database/SettingsManager";
import { Logger } from "../../Utils/SystemLogger";
import { EventFile } from "../../Handlers/eventHandler";
import { handleRachaButton } from "../../Handlers/Buttons/racha";
import Suggestion from "../../Models/suggestion"; // 👈 nuevo import

import { InteractionLock } from "../../Models/InteractionLock";

type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;


const event: EventFile<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction, client): Promise<void> {

    const safeRespond = async (ix: AnyCtx, payload: any) => {
      try {
        if (payload.ephemeral) {
          payload.flags = MessageFlags.Ephemeral;
          delete payload.ephemeral;
        }
        if (ix.deferred && !ix.replied) {
          const editPayload = { ...payload };
          delete editPayload.flags;
          return await ix.editReply(editPayload);
        }
        if (!ix.replied) return await ix.reply(payload);
        return await ix.followUp(payload);
      } catch {
        try { return await ix.followUp(payload); } catch {}
      }
    };

    // =================================================================
    // ⚡ 1. AUTOCOMPLETADO
    // =================================================================
    if (interaction.isAutocomplete()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd || !("autocomplete" in cmd)) return;
      try {
        await (cmd as any).autocomplete(interaction, client);
      } catch (error) {
        console.error(`⚠️ Error en autocompletado:`, error instanceof Error ? error.message : String(error));
      }
      return;
    }

    // =================================================================
    // ⚔️ 2. SLASH COMMANDS
    // =================================================================
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      // =================================================================
      // 🛡️ DISTRIBUTED LOCK (Previene ejecución duplicada en cluster/múltiples entornos)
      // =================================================================
      try {
        // Intenta "reclamar" esta interacción creando un documento con su ID.
        // Si otro proceso ya lo creó, esto fallará gracias al índice único en _id.
        await InteractionLock.create({ _id: interaction.id });
      } catch (error: any) {
        // El código de error 11000 es "duplicate key".
        // Significa que otro proceso ya reclamó esta interacción.
        // Es un comportamiento esperado, así que simplemente nos detenemos.
        if (error.code === 11000) {
          return;
        }
        // Si es otro tipo de error de base de datos, sí debemos registrarlo.
        console.error(`❌ Error al intentar adquirir cerrojo para interacción ${interaction.id}:`, error);
        return; // Detenemos la ejecución para evitar más problemas.
      }
      // =================================================================

      const lag = Date.now() - interaction.createdTimestamp;
      if (lag > 2000) {
        console.warn(`⚠️ [ALERTA] La interacción /${interaction.commandName} tardó ${lag}ms. ¡Peligro de 10062!`);
      }

      if (!interaction.guild) {
        await interaction.reply({
          content: "🌸 Lo siento, mis comandos solo funcionan dentro de un servidor, nyaa~!",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
        return;
      }

      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd) {
        await interaction.reply({
          content: "🍥 Hmm... no encontré ese comando. ¿Seguro que lo escribiste bien? Puedes usar `/help` para ver la lista.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
        return;
      }

      const cmdName = cmd.data.name;

      // 🌟 Comandos que abren modales — NO se deferirán
      const commandsWithModals = ["sugerencia", "report", "racha"];
      const opensModal = commandsWithModals.includes(cmdName);

      const isEphemeral = Boolean(
        (cmd as any).options?.ephemeral ||
        (cmd as any).options?.adminOnly ||
        (cmd as any).ephemeral ||
        (cmd as any).adminOnly
      );

      // 🔥 DEFER centralizado (solo si NO abre modal)
      if (!opensModal) {
        try {
          await interaction.deferReply({
            flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
          });
        } catch (err) {
          console.error(`❌ [${cmdName}] Defer fallido:`, err);
          return;
        }
      }

      // 🕐 COOLDOWN
      const { cooldowns } = client;
      if (!cooldowns.has(cmdName)) cooldowns.set(cmdName, new Collection());

      const now = Date.now();
      const timestamps = cooldowns.get(cmdName)!;
      const cooldownAmount = (
        ("cooldown" in cmd ? cmd.cooldown : (cmd.options?.cooldown ?? 3)) as number
      ) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          const text = `⏳ ¡Hey, más despacio, cerebrito! Espera \`${timeLeft.toFixed(1)}\` segunditos antes de usarme otra vez, nyaa~.`;
          if (interaction.deferred) {
            await interaction.editReply({ content: text }).catch(() => {});
          } else {
            await interaction.reply({ content: text, flags: MessageFlags.Ephemeral }).catch(() => {});
          }
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await cmd.execute(interaction as ChatInputCommandInteraction, client);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`💥 Error en "${interaction.commandName}":`, err);
        const channelName = (interaction.channel && "name" in interaction.channel)
          ? (interaction.channel.name || "desconocido")
          : "desconocido";
        await Logger.logCommandError(interaction.user, cmdName, err.message, channelName);
        await handleCommandError(interaction as AnyCtx, err, safeRespond);
      }
      return;
    }

    // =================================================================
    // 🧩 3. COMPONENTES (Botones, Menús)
    // =================================================================

    // ── RACHA HANDLER ───────────────────────────────────────────────
    if (
      (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) &&
      interaction.customId.startsWith("racha_")
    ) {
      // Este handler ya tiene su propio try/catch y sistema de respuesta.
      await handleRachaButton(interaction, client);
      return;
    }

    // =================================================================
    // 🔘 4. BOTONES (Otros)
    // =================================================================
    if (interaction.isButton()) {

      if (interaction.customId.startsWith("verify_alt_")) {
        const userId = interaction.customId.split("_")[2];

        if (interaction.user.id !== userId) {
          void interaction.reply({
            content: "🌸 Nyaa... este botón no es para ti.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          await interaction.deferUpdate();
          for (const [, guild] of client.guilds.cache) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await HoshikoLogger.sendLog(
                guild,
                "VERIFICATION",
                `El usuario **${member.user.tag}** ha pasado la prueba del Anti-Alt.`,
                member.user,
              );
            }
          }
          await interaction.editReply({
            content: "✨ ¡Gracias por verificar! Ya puedes entrar. 🌸",
            embeds: [],
            components: [],
          });
          HoshikoLogger.log({
            level: LogLevel.INFO,
            context: "Security/AntiAlt",
            message: `Usuario ${interaction.user.tag} verificado.`,
          });
        } catch (err) {
          console.error("Error Anti-Alt:", err);
        }
        return;
      }

      if (
        interaction.customId === "confess_create_new" ||
        interaction.customId.startsWith("confess_reply_") ||
        interaction.customId === "confess_launcher_start"
      ) {
        if (!interaction.guildId) return;

        const settings = await SettingsManager.getLite(interaction.guildId, "confessions");

        if (settings?.confessions?.blacklist?.includes(interaction.user.id)) {
          void interaction.reply({
            content: "⛔ Lo siento, no tienes permitido usar este sistema en este momento.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const currentChannelId = interaction.channelId;
        const feedConfig = settings?.confessions?.feeds?.find(
          (f: any) => f.channelId === currentChannelId,
        );

        let title = "Crear Publicación";
        if (feedConfig) title = feedConfig.title;
        else if (settings?.confessions?.customTitle) title = settings.confessions.customTitle;

        const isReply = interaction.customId.startsWith("confess_reply_");
        let targetId = null;

        if (isReply) {
          targetId = interaction.customId.split("_")[2];
          title = `Respuesta a #${targetId}`;
        }

        if (title.length > 45) title = title.substring(0, 42) + "...";

        const modalId = isReply
          ? `confessionModal_reply_${targetId}_ch_${currentChannelId}`
          : `confessionModal_new_ch_${currentChannelId}`;

        const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("confessionInput")
              .setLabel("Mensaje")
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder("Escribe aquí...")
              .setRequired(true)
              .setMaxLength(2000),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("confessionImage")
              .setLabel("URL de Imagen (Opcional)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("https://i.imgur.com/example.png")
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("confessionIdentity")
              .setLabel("¿Mostrar tu nombre? (Escribe SI)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Déjalo vacío para ser ANÓNIMO")
              .setRequired(false)
              .setMaxLength(10),
          ),
        );

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId.startsWith("confess_report_")) {
        const targetId = interaction.customId.split("_")[2];

        const modal = new ModalBuilder()
          .setCustomId(`reportModal_${targetId}`)
          .setTitle(`Reportar Publicación #${targetId}`);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("reportReason")
              .setLabel("Motivo del reporte")
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder("Spam, odio, doxxing...")
              .setRequired(true)
              .setMaxLength(500),
          ),
        );

        await interaction.showModal(modal);
        return;
      }
    }

    // =================================================================
    // 📝 5. MODALES
    // =================================================================
    if (interaction.isModalSubmit()) {

      // ---------------------------------------------------------------
      // 💬 CONFESSION MODAL
      // ---------------------------------------------------------------
      if (interaction.customId.startsWith("confessionModal")) {
        let content = "";
        let rawImage = null;
        let identityChoice = "";

        try {
          content = interaction.fields.getTextInputValue("confessionInput");
          try { rawImage = interaction.fields.getTextInputValue("confessionImage"); } catch {}
          try { identityChoice = interaction.fields.getTextInputValue("confessionIdentity"); } catch {}
        } catch (err) {
          console.error("Error crítico leyendo modal:", err);
          void interaction.reply({
            content: "🍥 ¡Miau! No pude leer bien lo que escribiste. ¿Podrías intentarlo de nuevo?",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const isAnonymous = !identityChoice.match(/^(si|yes|yo|true|ok)$/i);
        const validImage = rawImage && rawImage.startsWith("http") ? rawImage : null;

        let replyToId: string | null = null;
        let targetChannelId: string | null = null;
        const parts = interaction.customId.split("_");

        if (interaction.customId.includes("_reply_")) replyToId = parts[2];

        const chIndex = parts.indexOf("ch");
        if (chIndex !== -1 && parts[chIndex + 1]) targetChannelId = parts[chIndex + 1];

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const confessionId = await ConfessionManager.create(
            interaction.member as any,
            content,
            validImage,
            replyToId,
            isAnonymous,
            targetChannelId,
          );

          const typeText = replyToId ? "Respuesta" : "Publicación";
          const modeText = isAnonymous ? "🔒 Anónima" : "🔓 Pública";

          await interaction.editReply({
            content: `✅ ¡Tu **${typeText}** ${modeText} fue enviada! Puedes verla con el ID: #${confessionId} ✨`,
          });
        } catch (error: any) {
          console.error("Error publicación:", error);
          await interaction.editReply({
            content: `😿 ¡Oh, no! Hubo un problema al enviar tu publicación: ${error.message || "Inténtalo de nuevo en un momento, nyaa..."}`,
          });
        }
        return;
      }

      // ---------------------------------------------------------------
      // 🚨 REPORT CONFESSION MODAL (botón de reporte en publicaciones)
      // ---------------------------------------------------------------
      if (interaction.customId.startsWith("reportModal_")) {
        if (!interaction.guildId) return;

        const targetId = interaction.customId.split("_")[1];
        const reason = interaction.fields.getTextInputValue("reportReason");

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const settings = await SettingsManager.getLite(interaction.guildId, "confessions");

          if (settings?.confessions?.logsChannelId) {
            const logsChannel = interaction.guild!.channels.cache.get(
              settings.confessions.logsChannelId,
            ) as TextChannel;

            if (logsChannel) {
              const alertEmbed = new EmbedBuilder()
                .setTitle("🚨 REPORTE DE SEGURIDAD")
                .setDescription(`Reporte sobre **Publicación #${targetId}**.`)
                .setColor("#FF0000")
                .addFields(
                  { name: "👮‍♂️ Reportado por", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "📝 Motivo", value: `\`\`\`${reason}\`\`\`` },
                  { name: "🛠️ Acción", value: `Usa \`/confession-check id:${targetId}\` para investigar.` },
                )
                .setTimestamp();

              await logsChannel.send({ content: "@here", embeds: [alertEmbed] });
            }
          }

          await interaction.editReply(
            "✅ ¡Reporte enviado! Gracias por cuidar la comunidad. Mis mods lo revisarán pronto. 👮‍♀️",
          );
        } catch (err) {
          console.error("Error enviando reporte:", err);
          await interaction.editReply("😿 ¡Miau! Hubo un problema al enviar tu reporte. Por favor, inténtalo de nuevo.");
        }
        return;
      }

      // ---------------------------------------------------------------
      // 💡 SUGERENCIA MODAL
      // ---------------------------------------------------------------
      if (interaction.customId === "sugerenciaModal") {
        if (!interaction.guildId) return;

        const ideaText = interaction.fields.getTextInputValue("ideaInput");

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const newSuggestion = new Suggestion({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            suggestion: ideaText,
          });
          await newSuggestion.save();

          const SUGGESTION_WEBHOOK_URL = process.env.SUGGESTION_WEBHOOK_URL;
          if (SUGGESTION_WEBHOOK_URL) {
            const webhook = new WebhookClient({ url: SUGGESTION_WEBHOOK_URL });
            const devEmbed = new EmbedBuilder()
                .setTitle("💡 NUEVA SUGERENCIA")
                .setColor("#FFD700")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                  {
                    name: "👤 Autor",
                    value: `**${interaction.user.tag}**\n🆔 ${interaction.user.id}`,
                    inline: true,
                  },
                  {
                    name: "🏠 Servidor",
                    value: `**${interaction.guild!.name}**\n🆔 ${interaction.guildId}`,
                    inline: true,
                  },
                  {
                    name: "💬 Idea",
                    value: `\`\`\`\n${ideaText}\n\`\`\``,
                  },
                )
                .setFooter({ text: `ID: #SUG-${Date.now().toString().slice(-6)}` })
                .setTimestamp();

            await webhook.send({
              username: "Hoshiko Sugerencias",
              avatarURL: client.user?.displayAvatarURL(),
              embeds: [devEmbed],
            });
          }

          await interaction.editReply({
            content: "✅ ¡Tu idea ha sido enviada! Mis creadores la revisarán. ¡Gracias por ayudarme a mejorar! 💖",
          });
        } catch (error) {
          console.error("Error guardando sugerencia:", error);
          await interaction.editReply({
            content: "❌ Ocurrió un error al guardar tu sugerencia, nyaa...",
          });
        }
        return;
      }

      // ---------------------------------------------------------------
      // 🐛 REPORT BUG MODAL
      // ---------------------------------------------------------------
      if (interaction.customId === "reportBugModal") {
        if (!interaction.guildId) return;

        const description = interaction.fields.getTextInputValue("descripcionInput");
        let capturaUrl: string | null = null;
        try {
          const raw = interaction.fields.getTextInputValue("capturaInput");
          if (raw?.startsWith("http")) capturaUrl = raw;
        } catch {}

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const REPORT_WEBHOOK_URL = process.env.REPORT_WEBHOOK_URL;
        if (!REPORT_WEBHOOK_URL) {
          await interaction.editReply({
            content: "⚙️ **Error de Configuración:** Mis creadores no han configurado el webhook de reportes. ¡Avísales, porfi!",
          });
          return;
        }

        try {
          const webhook = new WebhookClient({ url: REPORT_WEBHOOK_URL });

          const devEmbed = new EmbedBuilder()
            .setTitle("🚨 NUEVA INCIDENCIA REGISTRADA")
            .setColor("#FF0000")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
              {
                name: "👤 Reportero",
                value: `**${interaction.user.tag}**\n🆔 ${interaction.user.id}`,
                inline: true,
              },
              {
                name: "🏠 Ubicación",
                value: `**${interaction.guild!.name}**\n🆔 ${interaction.guildId}`,
                inline: true,
              },
              {
                name: "📅 Fecha",
                value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
                inline: false,
              },
              {
                name: "📝 Descripción del Bug",
                value: `\`\`\`\n${description}\n\`\`\``,
              },
            )
            .setFooter({ text: "Hoshiko Debug System • v2.0 Beta" })
            .setTimestamp();

          if (capturaUrl) {
            devEmbed.setImage(capturaUrl);
            devEmbed.addFields({
              name: "📎 Captura",
              value: `[Ver imagen](${capturaUrl})`,
            });
          }

          await webhook.send({
            username: "Hoshiko Reports",
            avatarURL: client.user?.displayAvatarURL(),
            embeds: [devEmbed],
          });

          const userEmbed = new EmbedBuilder()
            .setColor("#00FF99")
            .setTitle("✅ Reporte Enviado con Éxito")
            .setDescription(
              "Le he pasado el dato a mis creadores. ¡Muchas gracias por ayudarme a mejorar, nyaa~! 💖",
            )
            .addFields(
              {
                name: "🆔 ID de Referencia",
                value: `\`#BUG-${Date.now().toString().slice(-6)}\``,
                inline: true,
              },
              { name: "📁 Estado", value: "`En Revisión` 🕵️", inline: true },
            )
            .setFooter({ text: "Tu feedback es muy valioso para Hoshiko." });

          await interaction.editReply({ embeds: [userEmbed] });
        } catch (error) {
          console.error("❌ Error crítico en reportBugModal:", error);
          await interaction.editReply({
            content: "💥 ¡Boom! Algo salió mal justo cuando enviabas el reporte... Qué irónico, ¿no? Ya estoy investigando qué pasó, nyaa~.",
          });
        }
        return;
      }

    }
  },
};

export default event;


async function handleCommandError(
  interaction: AnyCtx,
  error: Error,
  safeRespond: (ix: AnyCtx, p: any) => Promise<any>,
) {
  let errorMessage = "😿 ¡Miau! Algo se rompió dentro de mí... Ya le avisé a mis creadores para que lo arreglen.";
  if ((error as any)?.code === 50013 || (error as any)?.code === 50001)
    errorMessage = "⛔ No puedo hacer eso... ¿Podrías revisar si tengo los permisos necesarios, porfi? 🥺";
  try {
    await safeRespond(interaction, { content: errorMessage, ephemeral: true });
  } catch {}
}
