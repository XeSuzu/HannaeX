import {
  ActionRowBuilder,
  ButtonInteraction,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
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
