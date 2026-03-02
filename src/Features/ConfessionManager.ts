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
import Confession from "../Models/Confession";
import ServerConfig from "../Models/serverConfig";

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

    // 3. ACTUALIZAR CONTADOR Y DB
    settings.confessions.counter += 1;
    settings.markModified("confessions");
    await settings.save();

    const currentId = settings.confessions.counter;
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
      timestamp: timestamp,
    });
    await newConfession.save();

    // 4. DISEÑO VISUAL INTELIGENTE 🎨
    const isReply = !!replyToId;

    // Buscamos si el canal actual es un Feed configurado (ej: Anécdotas)
    const feedConfig = settings.confessions.feeds?.find(
      (f) => f.channelId === targetChannelId,
    );

    // Definimos Título y Color base
    // Si es un Feed, usamos su configuración. Si es Confesión normal, usamos la default.
    const systemTitle = feedConfig
      ? `${feedConfig.emoji} ${feedConfig.title}`
      : settings.confessions.customTitle || "Confesión Anónima";
    const systemColor = feedConfig
      ? feedConfig.color
      : settings.confessions.customColor || "#FFB6C1";

    let authorName = "";
    let authorIcon = "";
    let embedColor: ColorResolvable = "#FFFFFF";
    let footerText = "";

    if (isAnonymous) {
      // 👻 MODO FANTASMA
      authorName = isReply
        ? `Fantasma Respondiendo a #${replyToId}`
        : `${systemTitle} #${currentId}`;
      authorIcon = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png"; // Icono Fantasma
      // Si es anónimo, usamos un color pastel random para variedad, o el del feed si prefieres
      embedColor =
        this.PASTEL_COLORS[
          Math.floor(Math.random() * this.PASTEL_COLORS.length)
        ];
      footerText = "🔒 Secreto • Identidad protegida";
    } else {
      // 👤 MODO PÚBLICO
      authorName = `${member.displayName}`;
      authorIcon = member.user.displayAvatarURL({ extension: "png" });
      // Color del rol del usuario o el del sistema
      embedColor =
        member.displayHexColor === "#000000"
          ? (systemColor as ColorResolvable)
          : member.displayHexColor;
      footerText = `🔓 Público • ID: #${currentId}`;
    }

    const publicEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: authorIcon })
      .setColor(embedColor)
      .setFooter({
        text: `Hoshiko Systems • ${footerText}`,
        iconURL: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
      })
      .setTimestamp();

    // Cuerpo del mensaje con diseño Aesthetic
    if (isReply) {
      publicEmbed.setDescription(
        `> 🗨️ **Respuesta:**\n\n${content}\n\n${this.SEPARATOR}`,
      );
    } else {
      if (content.length > 0)
        publicEmbed.setDescription(`> ${content}\n\n${this.SEPARATOR}`);
      else if (image)
        publicEmbed.setDescription(
          `> 📸 *Ha compartido una imagen...*\n\n${this.SEPARATOR}`,
        );
    }

    if (image) publicEmbed.setImage(image);
    if (isAnonymous && !image)
      publicEmbed.setThumbnail(
        "https://cdn-icons-png.flaticon.com/512/566/566601.png",
      );

    // 5. PUBLICAR Y GESTIONAR HILOS
    let msg = null;

    if (isReply && replyToId) {
      // CASO A: RESPUESTA
      const originalConfession = await Confession.findOne({
        guildId: guild.id,
        confessionId: parseInt(replyToId),
      });
      let sentInThread = false;

      if (originalConfession && originalConfession.publicMessageId) {
        try {
          // Intentamos buscar el mensaje original EN EL CANAL ACTUAL
          const originalMsg = await publicChannel.messages
            .fetch(originalConfession.publicMessageId)
            .catch(() => null);
          if (originalMsg) {
            let thread = originalMsg.thread;
            if (!thread) {
              thread = await originalMsg.startThread({
                name: `💬 Comentarios: #${replyToId}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
              });
            }
            msg = await thread.send({ embeds: [publicEmbed] });
            sentInThread = true;
          }
        } catch (e) {}
      }
      // Si no pudimos ponerlo en el hilo, lo mandamos suelto
      if (!sentInThread)
        msg = await publicChannel.send({
          content: `↪️ **Respuesta a #${replyToId}:**`,
          embeds: [publicEmbed],
        });
    } else {
      // CASO B: NUEVA PUBLICACIÓN
      // Botones actualizados para seguir en el mismo canal
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("confess_create_new")
          .setLabel("Publicar Aquí")
          .setEmoji("✨")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`confess_reply_${currentId}`)
          .setLabel("Responder")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`confess_report_${currentId}`)
          .setLabel("Reportar")
          .setStyle(ButtonStyle.Danger),
      );

      msg = await publicChannel.send({
        embeds: [publicEmbed],
        components: [buttons],
      });

      try {
        // Nombre del hilo dinámico
        const threadName = isAnonymous
          ? `${feedConfig ? feedConfig.emoji : "👻"} Hilo #${currentId}`
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
    if (settings.confessions.logsChannelId) {
      const logsChannel = guild.channels.cache.get(
        settings.confessions.logsChannelId,
      ) as TextChannel;
      if (logsChannel) {
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
            }, // Muestra dónde salió
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
        await logsChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }

    return currentId;
  }
}