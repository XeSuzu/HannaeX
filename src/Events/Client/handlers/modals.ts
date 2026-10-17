import {
  EmbedBuilder,
  MessageFlags,
  ModalSubmitInteraction,
  TextChannel,
  WebhookClient,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { ConfessionManager } from "../../../Features/ConfessionManager";
import { HoshikoClient } from "../../../index";
import Suggestion from "../../../Database/community/suggestion.model";

export async function handleModals(
  interaction: ModalSubmitInteraction,
  client: HoshikoClient,
) {
  if (interaction.customId.startsWith("confessionModal")) {
    let content = "";
    let rawImage = null;
    let identityChoice = "";

    try {
      content = interaction.fields.getTextInputValue("confessionInput");
      try {
        rawImage = interaction.fields.getTextInputValue("confessionImage");
      } catch {}
      try {
        identityChoice =
          interaction.fields.getTextInputValue("confessionIdentity");
      } catch {}
    } catch (err) {
      console.error("Error crítico leyendo modal:", err);
      void interaction.reply({
        content:
          "🍥 ¡Miau! No pude leer bien lo que escribiste. ¿Podrías intentarlo de nuevo?",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const isAnonymous = !identityChoice.match(/^(si|yes|yo|true|ok)$/i);
    const validImage =
      rawImage && rawImage.startsWith("http") ? rawImage : null;

    let replyToId: string | null = null;
    let targetChannelId: string | null = null;
    const parts = interaction.customId.split("_");

    if (interaction.customId.includes("_reply_")) replyToId = parts[2];
    const chIndex = parts.indexOf("ch");
    if (chIndex !== -1 && parts[chIndex + 1])
      targetChannelId = parts[chIndex + 1];

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
        content: `✅ ¡Tu **${typeText}**${modeText} fue enviada! Puedes verla con el ID: #${confessionId} ✨`,
      });
    } catch (error: any) {
      console.error("Error publicación:", error);
      await interaction.editReply({
        content: `😿 ¡Oh, no! Hubo un problema al enviar tu publicación: ${error.message || "Inténtalo de nuevo en un momento, nyaa..."}`,
      });
    }
    return;
  }

  if (interaction.customId.startsWith("reportModal_")) {
    if (!interaction.guildId) return;
    const targetId = interaction.customId.split("_")[1];
    const reason = interaction.fields.getTextInputValue("reportReason");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const settings = await SettingsManager.getLite(
        interaction.guildId,
        "confessions",
      );
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
              {
                name: "👮‍♂️ Reportado por",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              { name: "📝 Motivo", value: `\`\`\`${reason}\`\`\`` },
              {
                name: "🛠️ Acción",
                value: `Usa \`/confession-check id:${targetId}\` para investigar.`,
              },
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
      await interaction.editReply(
        "😿 ¡Miau! Hubo un problema al enviar tu reporte. Por favor, inténtalo de nuevo.",
      );
    }
    return;
  }

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
            { name: "💬 Idea", value: `\`\`\`\n${ideaText}\n\`\`\`` },
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
        content:
          "✅ ¡Tu idea ha sido enviada! Mis creadores la revisarán. ¡Gracias por ayudarme a mejorar! 💖",
      });
    } catch (error) {
      console.error("Error guardando sugerencia:", error);
      await interaction.editReply({
        content: "❌ Ocurrió un error al guardar tu sugerencia, nyaa...",
      });
    }
    return;
  }

  if (interaction.customId === "reportBugModal") {
    if (!interaction.guildId) return;
    const description =
      interaction.fields.getTextInputValue("descripcionInput");
    let capturaUrl: string | null = null;
    try {
      const raw = interaction.fields.getTextInputValue("capturaInput");
      if (raw?.startsWith("http")) capturaUrl = raw;
    } catch {}

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const REPORT_WEBHOOK_URL = process.env.REPORT_WEBHOOK_URL;
    if (!REPORT_WEBHOOK_URL) {
      await interaction.editReply({
        content:
          "⚙️ **Error de Configuración:** Mis creadores no han configurado el webhook de reportes. ¡Avísales, porfi!",
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
        content:
          "💥 ¡Boom! Algo salió mal justo cuando enviabas el reporte... Qué irónico, ¿no? Ya estoy investigando qué pasó, nyaa~.",
      });
    }
    return;
  }
}
