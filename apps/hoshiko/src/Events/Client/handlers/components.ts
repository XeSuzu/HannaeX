import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import ServerConfig from "../../../Database/guild/serverConfig.model";
import Confession from "../../../Database/community/confession.model";
import { queueTrustScoreDelta } from "../../../Database/system/BulkWriteBuffer";
import {
  addServerStress,
  markUserSafe,
  takeDeletedMessages,
} from "../../../Features/automod/automodState";
import { LocalCacheService } from "../../../App/infrastructure/cache/LocalCacheService";
import { handleRachaButton } from "../../../Handlers/Buttons/racha";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";
import { canModerateTarget } from "../../../Utils/moderationGuards";
import { createCase } from "../../../Database/moderation/case.model";

type ComponentInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

export const buttonActionLocks = new LocalCacheService<{ locked: true }>(
  "button_action_locks",
  { max: 5000, ttlMs: 10_000 },
);

export async function handleComponents(
  interaction: ComponentInteraction,
  client: HoshikoClient,
) {
  if (interaction.customId.startsWith("racha_")) {
    await handleRachaButton(interaction, client);
    return;
  }

  if (!interaction.isButton()) return;

  // ─── REVISIÓN DE IA MODERACIÓN ───────────────────────────────────────────
  if (interaction.customId.startsWith("mod_review:")) {
    if (!interaction.guild || !interaction.memberPermissions) return;
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: "⛔ Requiere permiso de **Gestionar Mensajes** para resolver esta revisión.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, act, authorId, msgId] = interaction.customId.split(":");

    let targetMember: GuildMember | null = null;
    if (act === "mute") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({
          content: "⛔ Requiere permiso de **Moderar Miembros** para aislar a este usuario.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      targetMember = await interaction.guild.members.fetch(authorId).catch(() => null);
      if (!targetMember) {
        await interaction.reply({
          content: "❌ No se encontró al usuario en este servidor.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const check = canModerateTarget(interaction.member as GuildMember, targetMember);
      if (!check.canModerate || !targetMember.moderatable) {
        await interaction.reply({
          content: check.reason || "❌ No tienes jerarquía suficiente para aislar a este usuario.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferUpdate();

    let caseNumber: number | null = null;
    if (act === "del") {
      HoshikoLogger.markBotMessageDelete(msgId);
      for (const [, ch] of interaction.guild.channels.cache) {
        if (!ch.isTextBased()) continue;
        const msg = await (ch as any).messages.fetch(msgId).catch(() => null);
        if (msg) {
          await msg.delete().catch(() => null);
          break;
        }
      }
      const createdCase = await createCase({
        guildId: interaction.guild.id,
        userId: authorId,
        modId: interaction.user.id,
        action: "purge",
        reason: `Mensaje eliminado desde #message-review por ${interaction.user.tag}`,
        source: "manual",
      }).catch(() => null);
      caseNumber = createdCase?.caseId ?? null;
      await HoshikoLogger.logAction(interaction.guild, "PURGE", {
        moderator: interaction.user,
        reason: `Mensaje eliminado tras revisión humana (ID: ${msgId})`,
        caseId: caseNumber,
        source: "Revisión (#message-review)",
      });
    } else if (act === "mute") {
      if (targetMember && targetMember.moderatable) {
        await targetMember.timeout(10 * 60 * 1000, `Revisión IA por ${interaction.user.tag}`).catch(() => null);
        const createdCase = await createCase({
          guildId: interaction.guild.id,
          userId: authorId,
          modId: interaction.user.id,
          action: "timeout",
          reason: `Aislado 10m desde #message-review por ${interaction.user.tag}`,
          source: "manual",
          durationMs: 10 * 60 * 1000,
        }).catch(() => null);
        caseNumber = createdCase?.caseId ?? null;
        await HoshikoLogger.logAction(interaction.guild, "MUTE", {
          user: targetMember.user,
          moderator: interaction.user,
          reason: "Aislado 10m tras revisión humana",
          duration: "10m",
          caseId: caseNumber,
          source: "Revisión (#message-review)",
        });
      }
    } else if (act === "dismiss") {
      markUserSafe(interaction.guild.id, authorId, 2 * 60 * 60 * 1000);
    }

    const embed = interaction.message.embeds[0]
      ? EmbedBuilder.from(interaction.message.embeds[0])
      : new EmbedBuilder();
    embed.setColor(act === "dismiss" ? 0x57f287 : 0xed4245);
    embed.addFields({
      name: "📌 Resolución humana",
      value: `Revisado por <@${interaction.user.id}> (${act === "dismiss" ? "Descartado como seguro" : act === "del" ? "Mensaje eliminado" : "Usuario aislado 10m"})${caseNumber ? ` • Caso #${caseNumber}` : ""}`,
    });
    await interaction.editReply({ embeds: [embed], components: [] });
    return;
  }

  // ─── CENTRO DE COMANDO EN LOGS (PILAR 5) ─────────────────────────────────
  if (interaction.customId.startsWith("modlog_act:")) {
    if (!interaction.guild || !interaction.memberPermissions) return;

    const [, action, targetId] = interaction.customId.split(":");

    // Diferenciar permisos requeridos por acción
    let hasPermission = false;
    let requiredPermName = "";

    switch (action) {
      case "timeout":
      case "unmute":
        hasPermission = interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers);
        requiredPermName = "Moderar Miembros";
        break;
      case "ban":
      case "unban":
        hasPermission = interaction.memberPermissions.has(PermissionFlagsBits.BanMembers);
        requiredPermName = "Banear Miembros";
        break;
      case "purge":
        hasPermission = interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);
        requiredPermName = "Gestionar Mensajes";
        break;
      case "forgive":
        hasPermission = interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers);
        requiredPermName = "Moderar Miembros";
        break;
      case "warns":
        hasPermission =
          interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers) ||
          interaction.memberPermissions.has(PermissionFlagsBits.BanMembers) ||
          interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);
        requiredPermName = "Moderar Miembros";
        break;
      case "sentinel":
        await interaction.reply({
          content: "🛡️ Sentinel y la inteligencia de amenazas global son administrados exclusivamente por Hoshiko Security.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      default:
        hasPermission = false;
        requiredPermName = "Permisos de Moderación";
    }

    if (!hasPermission) {
      await interaction.reply({
        content: `⛔ Requiere permiso de **${requiredPermName}** para ejecutar esta acción.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;

    // Validar objetivos intocables (owner, bot, uno mismo)
    if (
      action === "timeout" ||
      action === "ban" ||
      action === "forgive" ||
      action === "unmute"
    ) {
      if (targetId === guild.ownerId) {
        await interaction.reply({
          content: "❌ No se puede aplicar moderación al dueño del servidor.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (targetId === client.user.id) {
        await interaction.reply({
          content: "🌸 No puedes realizar acciones de moderación sobre mí.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (targetId === interaction.user.id) {
        await interaction.reply({
          content: "🌸 No puedes realizar acciones de moderación sobre ti mismo.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Bloqueo de concurrencia y doble clic (AUD-07)
    const lockKey = `lock:btn:${guild.id}:${action}:${targetId}`;
    if (buttonActionLocks.get(lockKey)) {
      await interaction.reply({
        content:
          "⚠️ Esta acción ya está siendo procesada o fue ejecutada por otro moderador.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    buttonActionLocks.set(lockKey, { locked: true });

    await interaction.deferUpdate();

    let member: GuildMember | null = null;
    if (targetId && targetId !== "0") {
      try {
        member = await guild.members.fetch(targetId);
      } catch (fetchErr: any) {
        // SOLO si fetchErr.code === 10007 (Unknown Member) se asume que no está en el servidor (AUD-02)
        if (fetchErr?.code === 10007) {
          member = null;
        } else if (action === "ban") {
          await interaction.followUp({
            content: `❌ No se pudo verificar la jerarquía del usuario debido a un error transitorio de Discord (${fetchErr?.message || "error de conexión"}). Acción abortada por seguridad.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        } else {
          member = null;
        }
      }
    }

    // Validar siempre canModerateTarget si el miembro existe en el servidor (AUD-06)
    if (
      member &&
      (action === "timeout" ||
        action === "ban" ||
        action === "forgive" ||
        action === "unmute")
    ) {
      const check = canModerateTarget(
        interaction.member as GuildMember,
        member,
      );
      if (!check.canModerate) {
        await interaction.followUp({
          content:
            check.reason ||
            "❌ No tienes jerarquía suficiente para moderar a este usuario.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    let resolutionText = "";
    let resolvedColor = 0x57f287;

    try {
      if (action === "timeout") {
        if (!member) {
          await interaction.followUp({
            content: "❌ No puedo aislar a este usuario (no se encuentra en el servidor).",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (!member.moderatable) {
          await interaction.followUp({
            content: "❌ No puedo aislar a este usuario (su rol es superior al mío o no es moderable).",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await member.timeout(
          60 * 60 * 1000,
          `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
        );
        let caseNumber: number | null = null;
        try {
          const newCase = await createCase({
            guildId: guild.id,
            userId: targetId,
            modId: interaction.user.id,
            action: "timeout",
            reason: `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
            source: "manual",
            durationMs: 60 * 60 * 1000,
          });
          caseNumber = newCase.caseId;
        } catch (err) {
          console.error("Error al registrar caso en modlog_act:timeout:", err);
        }
        resolutionText = `🔇 **Aislado 1h**${caseNumber ? ` (Caso #${caseNumber})` : ""} por <@${interaction.user.id}>`;
      } else if (action === "ban") {
        HoshikoLogger.markBotModerationAction(guild.id, "BAN", targetId);
        await guild.members.ban(targetId, {
          deleteMessageSeconds: 86400,
          reason: `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
        });
        let caseNumber: number | null = null;
        try {
          const newCase = await createCase({
            guildId: guild.id,
            userId: targetId,
            modId: interaction.user.id,
            action: "ban",
            reason: `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
            source: "manual",
          });
          caseNumber = newCase.caseId;
        } catch (err) {
          console.error("Error al registrar caso en modlog_act:ban:", err);
        }
        resolutionText = `🔨 **Baneado**${caseNumber ? ` (Caso #${caseNumber})` : ""} por <@${interaction.user.id}>`;
        resolvedColor = 0xed4245;
      } else if (action === "purge") {
        // Acotar la purga al canal de origen del incidente
        let targetChannelId: string | null = null;
        for (const row of interaction.message.components) {
          for (const comp of (row as any).components) {
            if (comp.url) {
              const match = comp.url.match(/channels\/\d+\/(\d+)\/\d+/);
              if (match) {
                targetChannelId = match[1];
                break;
              }
            }
          }
          if (targetChannelId) break;
        }

        if (!targetChannelId && interaction.message.embeds.length > 0) {
          const embed = interaction.message.embeds[0];
          const descMatch = embed.description?.match(/<#(\d+)>/);
          if (descMatch) {
            targetChannelId = descMatch[1];
          } else {
            for (const field of embed.fields) {
              const fieldMatch = field.value.match(/<#(\d+)>/);
              if (fieldMatch) {
                targetChannelId = fieldMatch[1];
                break;
              }
            }
          }
        }

        if (!targetChannelId) {
          await interaction.followUp({
            content: "❌ No se pudo determinar el canal de origen del incidente para realizar la purga.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const targetChannel =
          guild.channels.cache.get(targetChannelId) ??
          (await guild.channels.fetch(targetChannelId).catch(() => null));

        if (!targetChannel || !targetChannel.isTextBased()) {
          await interaction.followUp({
            content: "❌ El canal de origen de la infracción no fue encontrado o no es un canal de texto.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const textCh = targetChannel as TextChannel;

        // Validar permisos del moderador en el canal destino (AUD-08)
        const memberPermsInChannel = textCh.permissionsFor(
          interaction.member as GuildMember,
        );
        if (
          !memberPermsInChannel ||
          !memberPermsInChannel.has(PermissionFlagsBits.ViewChannel) ||
          !memberPermsInChannel.has(PermissionFlagsBits.ManageMessages)
        ) {
          await interaction.followUp({
            content:
              "⛔ No tienes permisos suficientes (`Ver Canal` y `Gestionar Mensajes`) en el canal de origen para purgar estos mensajes.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const msgs = await textCh.messages.fetch({ limit: 50 }).catch(() => null);
        let deletedCount = 0;
        if (msgs) {
          const userMsgs = msgs.filter(
            (m) =>
              m.author.id === targetId &&
              Date.now() - m.createdTimestamp < 14 * 86400_000,
          );
          if (userMsgs.size > 0) {
            const deleted = await textCh.bulkDelete(userMsgs, true).catch(() => null);
            deletedCount = deleted?.size ?? 0;
          }
        }
        resolutionText = `🧹 **Purga completada** (${deletedCount} msgs en <#${targetChannel.id}>) por <@${interaction.user.id}>`;
      } else if (action === "forgive") {
        if (member && member.isCommunicationDisabled()) {
          await member
            .timeout(null, `Falso positivo marcado por ${interaction.user.tag}`)
            .catch(() => null);
        }
        markUserSafe(guild.id, targetId, 2 * 60 * 60 * 1000);
        await addServerStress(guild.id, -50);
        queueTrustScoreDelta(targetId, 1);

        const deletedRecords = takeDeletedMessages(guild.id, targetId);
        let restoredMsgs = deletedRecords.length;
        for (const rec of deletedRecords) {
          const ch = guild.channels.cache.get(rec.channelId);
          if (ch?.isTextBased()) {
            const sanitizedPreview = rec.content
              .replace(/https?:\/\/\S+/gi, "[enlace neutralizado]")
              .slice(0, 200);
            await (ch as TextChannel)
              .send({
                content: `ℹ️ **Falso positivo verificado por moderación**: La sanción automática aplicada a <@${targetId}> fue anulada por <@${interaction.user.id}>.\n*Contenido neutralizado:* \`${sanitizedPreview}\``,
                allowedMentions: { parse: [] },
              })
              .catch(() => null);
          }
        }

        resolutionText = `✅ **Falso Positivo verificado** (${restoredMsgs} msg aclarados) por <@${interaction.user.id}>`;
      } else if (action === "unmute") {
        if (!member) {
          await interaction.followUp({
            content:
              "❌ No puedo quitar el silencio a este usuario (no se encuentra en el servidor).",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        try {
          if (member.moderatable === false) {
            await interaction.followUp({
              content:
                "❌ No puedo quitar el silencio a este usuario (su rol es superior al mío o no es moderable).",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        } catch {
          // Fallback si member es mock o no tiene cache de roles cargada
        }
        if (member.isCommunicationDisabled()) {
          await member
            .timeout(null, `Silencio retirado desde Centro de Logs por ${interaction.user.tag}`)
            .catch(() => null);
        }
        let caseNumber: number | null = null;
        try {
          const newCase = await createCase({
            guildId: guild.id,
            userId: targetId,
            modId: interaction.user.id,
            action: "unmute",
            reason: `Silencio retirado desde Centro de Logs por ${interaction.user.tag}`,
            source: "manual",
          });
          caseNumber = newCase.caseId;
        } catch (err) {
          console.error("Error al registrar caso en modlog_act:unmute:", err);
        }
        resolutionText = `🔊 **Silencio retirado**${caseNumber ? ` (Caso #${caseNumber})` : ""} por <@${interaction.user.id}>`;
        resolvedColor = 0x57f287;
      } else if (action === "unban") {
        HoshikoLogger.markBotModerationAction(guild.id, "UNBAN", targetId);
        await guild.bans
          .remove(targetId, `Desbaneado desde Centro de Logs por ${interaction.user.tag}`)
          .catch(() => null);
        let caseNumber: number | null = null;
        try {
          const newCase = await createCase({
            guildId: guild.id,
            userId: targetId,
            modId: interaction.user.id,
            action: "unban",
            reason: `Desbaneado desde Centro de Logs por ${interaction.user.tag}`,
            source: "manual",
          });
          caseNumber = newCase.caseId;
        } catch (err) {
          console.error("Error al registrar caso en modlog_act:unban:", err);
        }
        resolutionText = `🔓 **Desbaneado**${caseNumber ? ` (Caso #${caseNumber})` : ""} por <@${interaction.user.id}>`;
        resolvedColor = 0x57f287;
      } else if (action === "warns") {
        const { getWarnings } = await import(
          "../../../Database/moderation/warning.model.js"
        );
        const warns = await getWarnings(guild.id, targetId);
        const list =
          warns
            .slice(0, 10)
            .map(
              (w, i) =>
                `${i + 1}. \`${new Date(w.createdAt).toLocaleDateString()}\` - ${w.reason} *(Mod: <@${w.moderatorId}>)*`,
            )
            .join("\n") || "No tiene advertencias registradas.";
        await interaction.followUp({
          content: `📜 **Historial de Advertencias de <@${targetId}> (${warns.length} en total):**\n${list}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = oldEmbed
        ? EmbedBuilder.from(oldEmbed)
            .setColor(resolvedColor)
            .addFields({
              name: "🛡️ Incidente Resuelto",
              value: resolutionText,
              inline: false,
            })
        : new EmbedBuilder()
            .setColor(resolvedColor)
            .setDescription(resolutionText);

      const disabledRows = interaction.message.components.map((row: any) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          row.components.map((c: any) =>
            ButtonBuilder.from(c).setDisabled(true),
          ),
        ),
      );

      await interaction.editReply({
        embeds: [updatedEmbed],
        components: disabledRows,
      });
    } catch (err) {
      console.error("❌ Error ejecutando acción en modlog:", err);
      await interaction.followUp({
        content: "❌ Ocurrió un error inesperado al procesar la acción.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (
    interaction.customId === "confess_create_new" ||
    interaction.customId.startsWith("confess_reply_") ||
    interaction.customId === "confess_launcher_start"
  ) {
    if (!interaction.guildId) return;
    const settings = await SettingsManager.getLite(
      interaction.guildId,
      "confessions",
    );

    if (settings?.confessions?.blacklist?.includes(interaction.user.id)) {
      await interaction
        .reply({
          content:
            "⛔ Lo siento, no tienes permitido usar este sistema en este momento.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    const currentChannelId = interaction.channelId;
    const feedConfig = settings?.confessions?.feeds?.find(
      (f: any) => f.channelId === currentChannelId,
    );
    let title = "Crear Publicación";
    if (feedConfig) title = feedConfig.title;
    else if (settings?.confessions?.customTitle)
      title = settings.confessions.customTitle;

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

  if (interaction.customId.startsWith("quick_delconfess_")) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction
        .reply({
          content: "No tienes los permisos necesarios para borrar publicaciones.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    const targetId = Number(interaction.customId.split("_")[2]);

    const confession = await Confession.findOne({
      guildId: interaction.guildId,
      confessionId: targetId,
    });

    if (!confession) {
      await interaction
        .reply({
          content: `❌ La publicación #${targetId} no existe en la base de datos.`,
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    if (confession.isDeleted) {
      await interaction
        .reply({
          content: `⚠️ La publicación #${targetId} ya ha sido borrada anteriormente.`,
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    const settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    const targetChannelId = confession.channelId || settings?.confessions?.channelId;

    if (targetChannelId && confession.publicMessageId && interaction.guild) {
      const channel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel;
      if (channel) {
        const msg = await channel.messages.fetch(confession.publicMessageId).catch(() => null);
        if (msg) await msg.delete().catch(() => null);
      }
    }

    confession.isDeleted = true;
    await confession.save();

    await interaction
      .reply({
        content: `🗑️ **Publicación #${targetId} eliminada exitosamente** por <@${interaction.user.id}> 🐾`,
      })
      .catch(() => null);
    return;
  }
}
