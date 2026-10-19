import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  EmbedBuilder,
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
import { queueTrustScoreDelta } from "../../../Database/system/BulkWriteBuffer";
import {
  banRecentRaiders,
  liftServerLockdown,
} from "../../../Features/automod/aiModeration";
import {
  addServerStress,
  takeDeletedMessages,
} from "../../../Features/automod/automodState";
import { whitelistUser } from "../../../Features/automod/automodPersistence";
import { SentinelNetwork } from "../../../Features/sentinelNetwork";
import { handleRachaButton } from "../../../Handlers/Buttons/racha";
import { HoshikoClient } from "../../../index";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";

type ComponentInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

export async function handleComponents(
  interaction: ComponentInteraction,
  client: HoshikoClient,
) {
  if (interaction.customId.startsWith("racha_")) {
    await handleRachaButton(interaction, client);
    return;
  }

  if (!interaction.isButton()) return;

  // ─── CENTRO DE COMANDO EN LOGS (PILAR 5) ─────────────────────────────────
  if (interaction.customId.startsWith("modlog_act:")) {
    if (!interaction.guild || !interaction.memberPermissions) return;

    const canMod =
      interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers) ||
      interaction.memberPermissions.has(PermissionFlagsBits.BanMembers) ||
      interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);

    if (!canMod) {
      await interaction.reply({
        content: "⛔ No tienes permisos de moderación para resolver este incidente.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, action, targetId] = interaction.customId.split(":");
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const member =
      targetId && targetId !== "0"
        ? await guild.members.fetch(targetId).catch(() => null)
        : null;
    let resolutionText = "";
    let resolvedColor = 0x57f287;

    try {
      if (action === "timeout") {
        if (!member || !member.moderatable) {
          await interaction.followUp({
            content: "❌ No puedo aislar a este usuario (ya salió o tiene un rol superior).",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await member.timeout(
          60 * 60 * 1000,
          `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
        );
        resolutionText = `🔇 **Aislado 1h** por <@${interaction.user.id}>`;
      } else if (action === "ban") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
          await interaction.followUp({
            content: "⛔ Requiere permiso de **Banear Miembros**.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await guild.members.ban(targetId, {
          deleteMessageSeconds: 86400,
          reason: `Resuelto desde Centro de Logs por ${interaction.user.tag}`,
        });
        resolutionText = `🔨 **Baneado** por <@${interaction.user.id}>`;
        resolvedColor = 0xed4245;
      } else if (action === "purge") {
        let deletedCount = 0;
        for (const [, ch] of guild.channels.cache) {
          if (!ch.isTextBased()) continue;
          const textCh = ch as TextChannel;
          const msgs = await textCh.messages
            .fetch({ limit: 50 })
            .catch(() => null);
          if (!msgs) continue;
          const userMsgs = msgs.filter(
            (m) =>
              m.author.id === targetId &&
              Date.now() - m.createdTimestamp < 14 * 86400_000,
          );
          if (userMsgs.size > 0) {
            const deleted = await textCh
              .bulkDelete(userMsgs, true)
              .catch(() => null);
            deletedCount += deleted?.size ?? 0;
          }
        }
        resolutionText = `🧹 **Purga completada** (${deletedCount} msgs) por <@${interaction.user.id}>`;
      } else if (action === "forgive") {
        if (member && member.isCommunicationDisabled()) {
          await member
            .timeout(null, `Falso positivo marcado por ${interaction.user.tag}`)
            .catch(() => null);
        }
        await whitelistUser(guild.id, targetId).catch(() => null);
        await addServerStress(guild.id, -50);
        queueTrustScoreDelta(targetId, 1);

        const deletedRecords = takeDeletedMessages(guild.id, targetId);
        let restoredMsgs = 0;
        for (const rec of deletedRecords) {
          const ch = guild.channels.cache.get(rec.channelId);
          if (ch?.isTextBased()) {
            const sent = await (ch as TextChannel)
              .send({
                content: `🔄 **Mensaje restaurado de <@${targetId}>** *(Falso positivo verificado)*:\n> ${rec.content.replace(/\n/g, "\n> ")}`,
                allowedMentions: { parse: [] },
              })
              .catch(() => null);
            if (sent) restoredMsgs++;
          }
        }

        resolutionText = `✅ **Falso Positivo / Whitelist** (${restoredMsgs} msg restaurados) por <@${interaction.user.id}>`;
      } else if (action === "sentinel") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
          await interaction.followUp({
            content: "⛔ Requiere permiso de **Banear Miembros** para reportar a Sentinel.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await SentinelNetwork.reportUser(
          targetId,
          `Reportado desde ${guild.name} por ${interaction.user.tag}`,
        );
        await guild.members
          .ban(targetId, {
            deleteMessageSeconds: 86400,
            reason: `Sentinel Network Report por ${interaction.user.tag}`,
          })
          .catch(() => null);
        resolutionText = `🌐 **Reportado a Sentinel y Baneado** por <@${interaction.user.id}>`;
        resolvedColor = 0xed4245;
      } else if (action === "unlockdown") {
        if (
          !interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles) &&
          !interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
        ) {
          await interaction.followUp({
            content: "⛔ Requiere permiso de **Gestionar Roles/Canales** para levantar el Lockdown.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const restored = await liftServerLockdown(guild, interaction.user.tag);
        resolutionText = restored
          ? `🔓 **Lockdown levantado** (\`@everyone\` puede escribir de nuevo) por <@${interaction.user.id}>`
          : `ℹ️ **No había un lockdown activo registrado** (revisado por <@${interaction.user.id}>)`;
      } else if (action === "banraid") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
          await interaction.followUp({
            content: "⛔ Requiere permiso de **Banear Miembros** para ejecutar el baneo por lotes.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const { found, banned } = await banRecentRaiders(
          guild,
          interaction.user.tag,
        );
        resolutionText = `🔨 **Baneo en lotes completado:** ${banned}/${found} raiders recientes baneados por <@${interaction.user.id}>`;
        resolvedColor = 0xed4245;
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
    } catch (err: any) {
      await interaction.followUp({
        content: `❌ Error ejecutando la acción: ${err.message || "Error desconocido"}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

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
    const settings = await SettingsManager.getLite(
      interaction.guildId,
      "confessions",
    );

    if (settings?.confessions?.blacklist?.includes(interaction.user.id)) {
      void interaction.reply({
        content:
          "⛔ Lo siento, no tienes permitido usar este sistema en este momento.",
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
}
