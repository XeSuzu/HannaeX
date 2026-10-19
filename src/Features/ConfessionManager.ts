import {
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  ThreadAutoArchiveDuration,
} from "discord.js";
import Confession from "../Database/community/confession.model";
import ServerConfig from "../Database/guild/serverConfig.model";
import { HoshikoLogger } from "../Security/Logger/HoshikoLogger";
import { generateConfessionCard } from "../Utils/confessionCard";

export class ConfessionManager {
  // 🎨 PALETA AESTHETIC (Colores Pastel para Anónimos)
  private static readonly PASTEL_COLORS: ColorResolvable[] = [
    "#FFB7B2",
    "#FFDAC1",
    "#E2F0CB",
    "#B5EAD7",
    "#C7CEEA",
    "#F6EAC2",
  ];

  // ✨ DECORACIÓN
  private static readonly SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━";

  /**
   * Crea una publicación (Confesión, Feed, Sugerencia, etc.)
   * Soporta Multi-Canal y Diseño Premium.
   */
  static async create(
    member: GuildMember,
    content: string,
    image: string | null = null,
    replyToId: string | null = null,
    isAnonymous: boolean = true,
    channelOverrideId: string | null = null, // 👇 NUEVO: Canal específico (Feed)
  ) {
    const guild = member.guild;

    // 1. OBTENER CONFIGURACIÓN
    const settings = await ServerConfig.findOne({ guildId: guild.id });

    if (!settings || !settings.confessions || !settings.confessions.enabled) {
      throw new Error("⚠️ El sistema no está activo.");
    }

    // 2. DEFINIR CANAL DE DESTINO
    // Si nos pasan un ID específico (porque viene de un botón de Feed), usamos ese.
    // Si no, usamos el canal por defecto de confesiones.
    const targetChannelId = channelOverrideId || settings.confessions.channelId;

    if (!targetChannelId)
      throw new Error("❌ No se encontró un canal válido para publicar.");

    const publicChannel = guild.channels.cache.get(
      targetChannelId,
    ) as TextChannel;
    if (!publicChannel)
      throw new Error("❌ El canal de destino no existe o fue borrado.");

    // 3. ACTUALIZAR CONTADOR ATÓMICAMENTE
    const updatedSettings = await ServerConfig.findOneAndUpdate(
      { guildId: guild.id },
      { $inc: { "confessions.counter": 1 } },
      { new: true },
    );
    const currentId = updatedSettings?.confessions?.counter ?? (settings.confessions.counter + 1);
    const timestamp = new Date();

    const newConfession = new Confession({
      guildId: guild.id,
      confessionId: currentId,
      authorId: member.id,
      authorTag: member.user.tag,
      content: content,
      imageUrl: image,
      isAnonymous: isAnonymous,
      replyToId: replyToId ? parseInt(replyToId) : null,
      channelId: targetChannelId,
      timestamp: timestamp,
    });
    await newConfession.save();

    // 4. DISEÑO VISUAL INTELIGENTE 🎨
    const isReply = !!replyToId;

    const feedConfig = settings.confessions.feeds?.find(
      (f) => f.channelId === targetChannelId,
    );

    const systemTitle = feedConfig
      ? `${feedConfig.emoji} ${feedConfig.title}`
      : settings.confessions.customTitle || "Confesión Anónima";
    const systemColor = feedConfig
      ? feedConfig.color
      : settings.confessions.customColor || "#FFB6C1";

    let authorName = "";
    let authorIcon = "";
    let embedColor: ColorResolvable = "#FFFFFF";

    if (isAnonymous) {
      authorName = isReply
        ? `💬 Respuesta anónima a #${replyToId}`
        : `${systemTitle} #${currentId}`;
      authorIcon = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";
      embedColor =
        this.PASTEL_COLORS[
          Math.floor(Math.random() * this.PASTEL_COLORS.length)
        ];
    } else {
      authorName = `${member.displayName}`;
      authorIcon = member.user.displayAvatarURL({ extension: "png" });
      embedColor =
        member.displayHexColor === "#000000"
          ? (systemColor as ColorResolvable)
          : member.displayHexColor;
    }

    const publicEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: authorIcon })
      .setColor(embedColor)
      .setFooter({
        text: `Hoshiko 🐾 • ${isAnonymous ? "🔒 Anónimo" : "🔓 Público"} • ${guild.name}`,
      })
      .setTimestamp();

    if (isReply) {
      publicEmbed.setDescription(`>>> 🗨️ **Respuesta a #${replyToId}:**\n\n${content}`);
    } else {
      publicEmbed.setDescription(`>>> ${content}`);
    }

    if (image) publicEmbed.setImage(image);

    // Intentar generar tarjeta visual Canvas opcional
    let cardAttachment: any = null;
    const visualModeEnabled = settings.confessions.visualMode ?? false;

    if (visualModeEnabled && !image && !isReply) {
      try {
        let avatarBuffer: Buffer | null = null;
        if (!isAnonymous) {
          const avRes = await fetch(member.user.displayAvatarURL({ extension: "png", size: 128 }));
          avatarBuffer = Buffer.from(await avRes.arrayBuffer());
        }

        cardAttachment = await generateConfessionCard({
          title: feedConfig?.title || systemTitle,
          confessionId: currentId,
          content,
          isAnonymous,
          authorName: member.displayName,
          authorAvatarBuffer: avatarBuffer,
          serverName: guild.name,
          backgroundTheme: settings.confessions.cardTheme || "sakura",
        });
      } catch (err) {
        console.error("[ConfessionManager] Error generando tarjeta Canvas:", err);
      }
    }

    // 5. PUBLICAR Y GESTIONAR HILOS
    let msg = null;

    if (isReply && replyToId) {
      const originalConfession = await Confession.findOne({
        guildId: guild.id,
        confessionId: parseInt(replyToId),
      });
      let sentInThread = false;

      if (originalConfession && originalConfession.publicMessageId) {
        try {
          const sourceChannelId = originalConfession.channelId || targetChannelId;
          const sourceChannel = guild.channels.cache.get(sourceChannelId) as TextChannel;
          if (sourceChannel) {
            const originalMsg = await sourceChannel.messages
              .fetch(originalConfession.publicMessageId)
              .catch(() => null);
            if (originalMsg) {
              let thread = originalMsg.thread;
              if (!thread) {
                thread = await originalMsg.startThread({
                  name: `💬 Respuestas: #${replyToId}`,
                  autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                });
              }
              msg = await thread.send({ embeds: [publicEmbed] });
              sentInThread = true;
            }
          }
        } catch (e) {}
      }
      if (!sentInThread) {
        msg = await publicChannel.send({
          content: `↪️ **Respuesta a #${replyToId}:**`,
          embeds: [publicEmbed],
        });
      }
    } else {
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("confess_create_new")
          .setLabel("Confesar")
          .setEmoji("✍️")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`confess_reply_${currentId}`)
          .setLabel(`Responder (#${currentId})`)
          .setEmoji("💬")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`confess_report_${currentId}`)
          .setLabel("Reportar")
          .setEmoji("🚨")
          .setStyle(ButtonStyle.Danger),
      );

      const sendPayload: any = {
        embeds: [publicEmbed],
        components: [buttons],
      };
      if (cardAttachment) {
        sendPayload.files = [cardAttachment];
      }

      msg = await publicChannel.send(sendPayload);

      try {
        const threadName = isAnonymous
          ? `${feedConfig ? feedConfig.emoji : "💬"} Hilo #${currentId}`
          : `💬 Hilo de ${member.displayName}`;

        await msg.startThread({
          name: threadName,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        });
      } catch (e) {}
    }

    if (msg) {
      newConfession.publicMessageId = msg.id;
      await newConfession.save();
    }

    // 6. LOGS (ADMINISTRACIÓN)
    const logEmbed = new EmbedBuilder()
      .setTitle(`🛡️ LOG: CASO #${currentId}`)
      .setColor("#2B2D31")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "👤 Autor Real",
          value: `${member.user.tag}\n\`${member.id}\``,
          inline: true,
        },
        {
          name: "📺 Canal/Feed",
          value: `<#${targetChannelId}>`,
          inline: true,
        },
        {
          name: "🎭 Modo",
          value: isAnonymous ? "Anónimo" : "Público",
          inline: true,
        },
        {
          name: "📝 Contenido",
          value: `\`\`\`${content.substring(0, 1000)}\`\`\``,
        },
      )
      .setTimestamp();
    if (image) logEmbed.setImage(image);
    await HoshikoLogger.sendToChannel(guild, "confesslog", logEmbed);

    return currentId;
  }
}