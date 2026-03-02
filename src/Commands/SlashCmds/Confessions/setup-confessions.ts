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
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Confessions",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("setup-confessions")
    .setDescription("🌸 Configura el sistema de publicaciones anónimas~")
    .addChannelOption((option) =>
      option
        .setName("logs_channel")
        .setDescription("(Opcional) Canal donde llegan los logs de auditoría")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const logsChannelInput = interaction.options.getChannel("logs_channel") as TextChannel;

    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    if (!settings) settings = new ServerConfig({ guildId: interaction.guildId });

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

    if (logsChannelInput) {
      settings.confessions.logsChannelId = logsChannelInput.id;
      settings.markModified("confessions");
      await settings.save();
      await interaction.editReply(
        `✅ Nyaa~ El canal de auditoría ahora es ${logsChannelInput}. 🐾`,
      );
      return;
    }

    const isPremium = settings.premiumUntil && settings.premiumUntil > new Date();
    const currentUsage = settings.confessions.feeds.length;
    const limit = 3;

    let draft = {
      channelId: interaction.channelId,
      title: settings.confessions.customTitle || "Confesiones",
      emoji: "✨",
      description: "¡Envía tu mensaje anónimo o público aquí!",
      image: "",
      color: settings.confessions.customColor || "#ff9ecd",
    };

    const renderEmbed = () => {
      const embed = new EmbedBuilder()
        .setTitle(`${draft.emoji} ${draft.title} (Vista Previa~)`)
        .setDescription(draft.description)
        .setColor(draft.color as any)
        .setFooter({ text: "Modo Edición~ • Usa los botones para personalizar 🐾" });

      if (draft.image && draft.image.startsWith("http")) embed.setImage(draft.image);
      else embed.setThumbnail("https://cdn-icons-png.flaticon.com/512/10009/10009623.png");
      return embed;
    };

    const renderComponents = () => [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("setup_ch")
          .setPlaceholder("📺 Cambiar Canal de Destino"),
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

    // ✅ fetchReply para obtener el Message y poder crear el collector
    const msg = await interaction.fetchReply();
    await interaction.editReply({
      content: `🎛️ **Panel de Configuración~**\nSlots usados: \`${currentUsage}/${isPremium ? "♾️" : limit}\``,
      embeds: [renderEmbed()],
      components: renderComponents() as any,
    });

    const collector = msg.createMessageComponentCollector({ time: 900000 });

    collector.on("collect", async (i) => {
      if (i.customId === "setup_ch" && i.isChannelSelectMenu()) {
        draft.channelId = i.values[0];
        await i.update({ content: `✅ Destino: <#${draft.channelId}>`, embeds: [renderEmbed()] });
      }

      if (i.customId === "setup_basic") {
        const modal = new ModalBuilder().setCustomId("m_basic").setTitle("Datos Básicos~");
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
          const submit = await i.awaitModalSubmit({ time: 60000, filter: (m) => m.customId === "m_basic" });
          draft.title = submit.fields.getTextInputValue("t_title");
          draft.emoji = submit.fields.getTextInputValue("t_emoji");
          await submit.deferUpdate();
          await i.editReply({ embeds: [renderEmbed()] });
        } catch (e) {}
      }

      if (i.customId === "setup_visual") {
        const modal = new ModalBuilder().setCustomId("m_visual").setTitle("Apariencia~");
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
          const submit = await i.awaitModalSubmit({ time: 60000, filter: (m) => m.customId === "m_visual" });
          draft.description = submit.fields.getTextInputValue("t_desc");
          draft.image = submit.fields.getTextInputValue("t_img");
          await submit.deferUpdate();
          await i.editReply({ embeds: [renderEmbed()] });
        } catch (e) {}
      }

      if (i.customId === "setup_color") {
        const colors = ["#5865F2", "#EB459E", "#57F287", "#FEE75C", "#ED4245", "#ff9ecd", "#FFAA00", "#ffffff"];
        draft.color = colors[Math.floor(Math.random() * colors.length)];
        await i.update({ embeds: [renderEmbed()] });
      }

      if (i.customId === "setup_save") {
        await i.deferUpdate();

        let finalSettings = await ServerConfig.findOne({ guildId: interaction.guildId });
        if (!finalSettings) finalSettings = new ServerConfig({ guildId: interaction.guildId });
        if (!finalSettings.confessions.feeds) finalSettings.confessions.feeds = [];

        const existingIndex = finalSettings.confessions.feeds.findIndex(
          (f) => f.channelId === draft.channelId,
        );
        const isNew = existingIndex === -1;

        if (isNew && !isPremium && finalSettings.confessions.feeds.length >= limit) {
          await i.editReply({
            content: `⛔ Nyaa~ Alcanzaste el límite de **3 canales**.\n✨ Mejora a **Premium** para tener canales ilimitados~`,
            components: [],
            embeds: [],
          });
          return;
        }

        const targetChannel = interaction.guild?.channels.cache.get(draft.channelId) as TextChannel;
        if (!targetChannel) {
          await i.editReply({ content: "😿 No encontré el canal seleccionado..." });
          return;
        }

        let currentCounter = 0;
        if (!isNew) {
          const oldConfig = finalSettings.confessions.feeds.find((f) => f.channelId === draft.channelId);
          if (oldConfig?.counter) currentCounter = oldConfig.counter;
          finalSettings.confessions.feeds = finalSettings.confessions.feeds.filter(
            (f) => f.channelId !== draft.channelId,
          );
        }

        finalSettings.confessions.feeds.push({
          channelId: draft.channelId,
          title: draft.title,
          emoji: draft.emoji,
          color: draft.color,
          counter: currentCounter,
        });

        if (!finalSettings.confessions.channelId) {
          finalSettings.confessions.channelId = draft.channelId;
          finalSettings.confessions.enabled = true;
        }

        finalSettings.markModified("confessions");
        await finalSettings.save();

        const finalEmbed = new EmbedBuilder()
          .setTitle(`${draft.emoji} ${draft.title.toUpperCase()}`)
          .setDescription(draft.description)
          .setColor(draft.color as any)
          .setFooter({
            text: "Hoshiko • Privacidad Garantizada 🐾",
            iconURL: interaction.guild?.iconURL() || undefined,
          });

        if (draft.image) finalEmbed.setImage(draft.image);
        else finalEmbed.setThumbnail("https://cdn-icons-png.flaticon.com/512/10009/10009623.png");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("confess_launcher_start")
            .setLabel(`Publicar en ${draft.title}`)
            .setEmoji("✍️")
            .setStyle(ButtonStyle.Success),
        );

        await targetChannel.send({ embeds: [finalEmbed], components: [row] });
        await i.editReply({
          content: `✅ ¡Publicado con éxito! (${finalSettings.confessions.feeds.length}/${isPremium ? "♾️" : limit} slots usados) 🌸`,
          components: [],
          embeds: [],
        });
        collector.stop();
      }

      if (i.customId === "setup_cancel") {
        await i.update({ content: "❌ Cancelado~", components: [], embeds: [] });
        collector.stop();
      }
    });
  },
};
export default command;
