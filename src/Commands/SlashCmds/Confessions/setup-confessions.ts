import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  ComponentType,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-confessions")
    .setDescription("🛠️ Panel de Configuración de Publicaciones (Dashboard)")
    .addChannelOption((option) =>
      option
        .setName("logs_channel")
        .setDescription(
          "(Opcional) Configura rápidamente el canal de auditoría/logs",
        )
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    // --- 1. GESTIÓN DE CONFIGURACIÓN PREVIA ---
    const logsChannelInput = interaction.options.getChannel(
      "logs_channel",
    ) as TextChannel;

    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    if (!settings)
      settings = new ServerConfig({ guildId: interaction.guildId });

    // Inicialización segura
    if (!settings.confessions) {
      settings.confessions = {
        enabled: false,
        channelId: null,
        logsChannelId: null,
        counter: 0,
        allowImages: true,
        customTitle: "Confesión Anónima",
        customColor: "#FFB6C1",
        blacklist: [],
        feeds: [],
      };
    }
    if (!settings.confessions.feeds) settings.confessions.feeds = [];

    // Si solo configuran logs, no chequeamos límite de feeds
    if (logsChannelInput) {
      await interaction.deferReply({ ephemeral: true });
      settings.confessions.logsChannelId = logsChannelInput.id;
      settings.markModified("confessions");
      await settings.save();
      return interaction.editReply(
        `✅ **Logs actualizados:** El canal de auditoría ahora es ${logsChannelInput}.`,
      );
    }

    // --- 2. VERIFICACIÓN DE LÍMITE PREMIUM 💎 ---

    const isPremium =
      settings.premiumUntil && settings.premiumUntil > new Date();
    const currentUsage = settings.confessions.feeds.length;
    const limit = 3;

    // --- 3. DASHBOARD INTERACTIVO ---

    // Estado temporal
    let draft = {
      channelId: interaction.channelId,
      title: settings.confessions.customTitle || "Confesiones",
      emoji: "✨",
      description: "¡Envía tu mensaje anónimo o público aquí!",
      image: "",
      color: settings.confessions.customColor || "#5865F2",
    };

    const renderEmbed = () => {
      const embed = new EmbedBuilder()
        .setTitle(`${draft.emoji} ${draft.title} (Vista Previa)`)
        .setDescription(draft.description)
        .setColor(draft.color as any)
        .setFooter({
          text: "Modo Edición • Usa los botones para personalizar",
        });

      if (draft.image && draft.image.startsWith("http"))
        embed.setImage(draft.image);
      else
        embed.setThumbnail(
          "https://cdn-icons-png.flaticon.com/512/10009/10009623.png",
        );
      return embed;
    };

    const renderComponents = () => [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("setup_ch")
          .setPlaceholder("📺 Cambiar Canal de Destino")
          .setChannelTypes(ChannelType.GuildText),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("setup_basic")
          .setLabel("Editar Título")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📝"),
        new ButtonBuilder()
          .setCustomId("setup_visual")
          .setLabel("Editar Texto/Img")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🖼️"),
        new ButtonBuilder()
          .setCustomId("setup_color")
          .setLabel("Color")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🎨"),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("setup_save")
          .setLabel("✅ Publicar Sistema")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("setup_cancel")
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Danger),
      ),
    ];

    const msg = await interaction.reply({
      content: `🎛️ **Dashboard de Configuración**\nSlots usados: \`${currentUsage}/${isPremium ? "♾️" : limit}\``,
      embeds: [renderEmbed()],
      components: renderComponents() as any,
      ephemeral: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 900000 });

    collector.on("collect", async (i) => {
      // A) SELECCIÓN DE CANAL
      if (i.customId === "setup_ch" && i.isChannelSelectMenu()) {
        draft.channelId = i.values[0];
        await i.update({
          content: `✅ Destino: <#${draft.channelId}>`,
          embeds: [renderEmbed()],
        });
      }

      // B) MODALES (Título/Visual)
      if (i.customId === "setup_basic") {
        const modal = new ModalBuilder()
          .setCustomId("m_basic")
          .setTitle("Datos Básicos");
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("t_title")
              .setLabel("Título")
              .setValue(draft.title)
              .setStyle(TextInputStyle.Short),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("t_emoji")
              .setLabel("Emoji")
              .setValue(draft.emoji)
              .setStyle(TextInputStyle.Short),
          ),
        );
        await i.showModal(modal);
        try {
          const submit = await i.awaitModalSubmit({
            time: 60000,
            filter: (m) => m.customId === "m_basic",
          });
          draft.title = submit.fields.getTextInputValue("t_title");
          draft.emoji = submit.fields.getTextInputValue("t_emoji");
          await submit.deferUpdate();
          await i.editReply({ embeds: [renderEmbed()] });
        } catch (e) {}
      }

      if (i.customId === "setup_visual") {
        const modal = new ModalBuilder()
          .setCustomId("m_visual")
          .setTitle("Apariencia");
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("t_desc")
              .setLabel("Descripción")
              .setValue(draft.description)
              .setStyle(TextInputStyle.Paragraph),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("t_img")
              .setLabel("URL Imagen (Opcional)")
              .setValue(draft.image)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        );
        await i.showModal(modal);
        try {
          const submit = await i.awaitModalSubmit({
            time: 60000,
            filter: (m) => m.customId === "m_visual",
          });
          draft.description = submit.fields.getTextInputValue("t_desc");
          draft.image = submit.fields.getTextInputValue("t_img");
          await submit.deferUpdate();
          await i.editReply({ embeds: [renderEmbed()] });
        } catch (e) {}
      }

      // D) COLOR
      if (i.customId === "setup_color") {
        const colors = [
          "#5865F2",
          "#EB459E",
          "#57F287",
          "#FEE75C",
          "#ED4245",
          "#FFFFFF",
          "#000000",
          "#FFAA00",
        ];
        draft.color = colors[Math.floor(Math.random() * colors.length)];
        await i.update({ embeds: [renderEmbed()] });
      }

      // E) GUARDAR (CON VALIDACIÓN PREMIUM) 🔒
      if (i.customId === "setup_save") {
        await i.deferUpdate();

        // Recargamos settings para validación final
        let finalSettings = await ServerConfig.findOne({
          guildId: interaction.guildId,
        });
        if (!finalSettings)
          finalSettings = new ServerConfig({ guildId: interaction.guildId });
        if (!finalSettings.confessions.feeds)
          finalSettings.confessions.feeds = [];

        // Verificamos si es una EDICIÓN (el canal ya existe en feeds) o uno NUEVO
        const existingIndex = finalSettings.confessions.feeds.findIndex(
          (f) => f.channelId === draft.channelId,
        );
        const isNew = existingIndex === -1;

        // ⛔ LOGICA DE BLOQUEO
        if (
          isNew &&
          !isPremium &&
          finalSettings.confessions.feeds.length >= limit
        ) {
          return i.editReply({
            content: `⛔ **Límite Alcanzado (3/3).**\n\nTu servidor está en el plan gratuito y ha alcanzado el máximo de 3 canales de publicaciones.\n✨ **Mejora a Premium** para tener canales ilimitados.`,
            components: [],
            embeds: [],
          });
        }

        // Guardar
        const targetChannel = interaction.guild?.channels.cache.get(
          draft.channelId,
        ) as TextChannel;
        if (!targetChannel) return i.editReply("❌ Canal no encontrado.");

        // 👇 LÓGICA DE PRESERVACIÓN DE CONTADOR
        let currentCounter = 0;

        // Actualizar array
        if (!isNew) {
          // Si ya existe, guardamos su contador actual para no resetearlo
          const oldConfig = finalSettings.confessions.feeds.find(
            (f) => f.channelId === draft.channelId,
          );
          if (oldConfig && oldConfig.counter)
            currentCounter = oldConfig.counter;

          // Lo quitamos para volver a meterlo actualizado
          finalSettings.confessions.feeds =
            finalSettings.confessions.feeds.filter(
              (f) => f.channelId !== draft.channelId,
            );
        }

        finalSettings.confessions.feeds.push({
          channelId: draft.channelId,
          title: draft.title,
          emoji: draft.emoji,
          color: draft.color,
          counter: currentCounter, // <--- Inicializa en 0 o mantiene el valor previo
        });

        if (!finalSettings.confessions.channelId) {
          finalSettings.confessions.channelId = draft.channelId;
          finalSettings.confessions.enabled = true;
        }

        finalSettings.markModified("confessions");
        await finalSettings.save();

        // ENVIAR PANEL
        const finalEmbed = new EmbedBuilder()
          .setTitle(`${draft.emoji}  ${draft.title.toUpperCase()}`)
          .setDescription(draft.description)
          .setColor(draft.color as any)
          .setFooter({
            text: "Sistema Hoshiko • Privacidad Garantizada",
            iconURL: interaction.guild?.iconURL() || undefined,
          });

        if (draft.image) finalEmbed.setImage(draft.image);
        else
          finalEmbed.setThumbnail(
            "https://cdn-icons-png.flaticon.com/512/10009/10009623.png",
          );

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("confess_launcher_start")
            .setLabel(`Publicar en ${draft.title}`)
            .setEmoji("✍️")
            .setStyle(ButtonStyle.Success),
        );

        await targetChannel.send({ embeds: [finalEmbed], components: [row] });

        await i.editReply({
          content: `✅ **¡Publicado con éxito!** (${finalSettings.confessions.feeds.length}/${isPremium ? "♾️" : limit} slots usados)`,
          components: [],
          embeds: [],
        });
        collector.stop();
      }

      if (i.customId === "setup_cancel") {
        await i.update({
          content: "❌ Cancelado.",
          components: [],
          embeds: [],
        });
        collector.stop();
      }
    });
  },
};
