import {
  Events,
  Interaction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextChannel,
  EmbedBuilder,
  Collection,
} from "discord.js";
import { HoshikoClient } from "../../index";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";
import { ConfessionManager } from "../../Features/ConfessionManager";
import { SettingsManager } from "../../Database/SettingsManager";

type AnyCtx =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: HoshikoClient) {
    // --- Helper para responder seguro ---
    const safeRespond = async (ix: any, payload: any) => {
      try {
        if (ix.deferred && !ix.replied) return await ix.editReply(payload);
        if (!ix.replied) return await ix.reply(payload);
        return await ix.followUp(payload);
      } catch {
        try {
          return await ix.followUp(payload);
        } catch {}
      }
    };

    // =================================================================
    // ⚡ 1. AUTOCOMPLETADO
    // =================================================================
    if (interaction.isAutocomplete()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd || !cmd.autocomplete) return;

      try {
        await cmd.autocomplete(interaction, client);
      } catch (error) {
        console.error(
          `⚠️ Error en autocompletado de /${interaction.commandName}:`,
          error,
        );
      }
      return;
    }

    // =================================================================
    // ⚔️ 2. SLASH COMMANDS
    // =================================================================
    if (
      interaction.isChatInputCommand() ||
      interaction.isContextMenuCommand()
    ) {
      if (!interaction.guild) return;

      const cmd =
        client.slashCommands.get(interaction.commandName) ||
        client.commands.get(interaction.commandName);

      if (!cmd) {
        return safeRespond(interaction as AnyCtx, {
          content: "❌ Comando no encontrado en mi sistema.",
          ephemeral: true,
        });
      }

      // --- 🛡️ SISTEMA DE COOLDOWNS ---
      const { cooldowns } = client;

      if (!cooldowns.has(cmd.data.name)) {
        cooldowns.set(cmd.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(cmd.data.name)!;
      const cooldownAmount = (cmd.cooldown || 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id)! + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return safeRespond(interaction as AnyCtx, {
            content: `⏳ **Calma.** Espera \`${timeLeft.toFixed(1)}\` segundos para usar \`/${cmd.data.name}\`.`,
            ephemeral: true,
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await cmd.execute(interaction as any, client);
      } catch (error: any) {
        console.error(`💥 Error en "${interaction.commandName}":`, error);
        await handleCommandError(interaction as AnyCtx, error, safeRespond);
      }
      return;
    }

    // =================================================================
    // 🔘 3. BOTONES
    // =================================================================
    if (interaction.isButton()) {
      // --- A) ANTI-ALT ---
      if (interaction.customId.startsWith("verify_alt_")) {
        const userId = interaction.customId.split("_")[2];

        if (interaction.user.id !== userId) {
          return await interaction.reply({
            content: "🌸 Nyaa... este botón no es para ti.",
            ephemeral: true,
          });
        }

        try {
          await interaction.deferUpdate();
          const guilds = client.guilds.cache;

          for (const [guildId, guild] of guilds) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await HoshikoLogger.sendLog(
                guild,
                "✅ Verificación Exitosa",
                `El usuario **${member.user.tag}** ha pasado la prueba del Anti-Alt.`,
                0x00ff00,
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

      // --- B) CONFESIONES / FEEDS ---
      if (
        interaction.customId === "confess_create_new" ||
        interaction.customId.startsWith("confess_reply_") ||
        interaction.customId === "confess_launcher_start"
      ) {
        if (!interaction.guildId) return;

        // 1. OBTENER CONFIGURACIÓN (Lite)
        const settings = await SettingsManager.getLite(
          interaction.guildId,
          "confessions",
        );

        // 2. CHECK BLACKLIST
        if (settings?.confessions?.blacklist?.includes(interaction.user.id)) {
          return await interaction.reply({
            content:
              "⛔ **Acceso Denegado:** Has sido vetado del sistema de publicaciones por un administrador.",
            ephemeral: true,
          });
        }

        // 3. DETECTAR CONTEXTO (FEED)
        const currentChannelId = interaction.channelId;
        // Buscamos si este canal es un feed configurado
        const feedConfig = settings?.confessions?.feeds?.find(
          (f: any) => f.channelId === currentChannelId,
        );

        // Determinar título del Modal
        let title = "Crear Publicación";
        if (feedConfig) {
          title = feedConfig.title;
        } else if (settings?.confessions?.customTitle) {
          title = settings.confessions.customTitle;
        }

        // Lógica de respuesta
        const isReply = interaction.customId.startsWith("confess_reply_");
        let targetId = null;

        if (isReply) {
          targetId = interaction.customId.split("_")[2];
          title = `Respuesta a #${targetId}`;
        }

        // Recortar título si es muy largo (Discord API Limit)
        if (title.length > 45) title = title.substring(0, 42) + "...";

        // ID del Modal: incluimos el canal actual para saber dónde postear luego
        let modalId = isReply
          ? `confessionModal_reply_${targetId}_ch_${currentChannelId}`
          : `confessionModal_new_ch_${currentChannelId}`;

        const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);

        // Inputs del Modal
        const inputContent = new TextInputBuilder()
          .setCustomId("confessionInput")
          .setLabel("Mensaje")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Escribe aquí...")
          .setRequired(true)
          .setMaxLength(2000);

        const inputImage = new TextInputBuilder()
          .setCustomId("confessionImage")
          .setLabel("URL de Imagen (Opcional)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://i.imgur.com/example.png")
          .setRequired(false);

        const inputIdentity = new TextInputBuilder()
          .setCustomId("confessionIdentity")
          .setLabel("¿Mostrar tu nombre? (Escribe SI)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Déjalo vacío para ser ANÓNIMO")
          .setRequired(false)
          .setMaxLength(10);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(inputContent),
          new ActionRowBuilder<TextInputBuilder>().addComponents(inputImage),
          new ActionRowBuilder<TextInputBuilder>().addComponents(inputIdentity),
        );

        await interaction.showModal(modal);
        return;
      }

      // --- C) REPORTE ---
      if (interaction.customId.startsWith("confess_report_")) {
        const targetId = interaction.customId.split("_")[2];
        const modal = new ModalBuilder()
          .setCustomId(`reportModal_${targetId}`)
          .setTitle(`Reportar Publicación #${targetId}`);

        const input = new TextInputBuilder()
          .setCustomId("reportReason")
          .setLabel("Motivo del reporte")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Spam, odio, doxxing...")
          .setRequired(true)
          .setMaxLength(500);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        );
        await interaction.showModal(modal);
        return;
      }
    }

    // =================================================================
    // 📝 4. MODALES
    // =================================================================
    if (interaction.isModalSubmit()) {
      // --- A) PROCESAR PUBLICACIÓN ---
      if (interaction.customId.startsWith("confessionModal")) {
        let content = "";
        let rawImage = null;
        let identityChoice = "";

        try {
          content = interaction.fields.getTextInputValue("confessionInput");
          try {
            rawImage = interaction.fields.getTextInputValue("confessionImage");
          } catch (e) {}
          try {
            identityChoice =
              interaction.fields.getTextInputValue("confessionIdentity");
          } catch (e) {}
        } catch (err) {
          console.error("Error crítico leyendo modal:", err);
          return await interaction.reply({
            content: "❌ Error leyendo formulario. Intenta de nuevo.",
            ephemeral: true,
          });
        }

        const isAnonymous = !identityChoice.match(/^(si|yes|yo|true|ok)$/i);

        let validImage = null;
        if (rawImage && rawImage.startsWith("http")) {
          validImage = rawImage;
        }

        let replyToId: string | null = null;
        let targetChannelId: string | null = null;
        const parts = interaction.customId.split("_");

        // Extraer ID de respuesta
        if (interaction.customId.includes("_reply_")) {
          // Formato: confessionModal_reply_ID_ch_CHANNELID
          replyToId = parts[2];
        }

        // Extraer canal destino
        const chIndex = parts.indexOf("ch");
        if (chIndex !== -1 && parts[chIndex + 1]) {
          targetChannelId = parts[chIndex + 1];
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          // Usamos el Manager para crear la lógica
          const confessionId = await ConfessionManager.create(
            interaction.member as any,
            content,
            validImage,
            replyToId,
            isAnonymous,
            targetChannelId, // Pasamos el canal específico si existe
          );

          const typeText = replyToId ? "Respuesta" : "Publicación";
          const modeText = isAnonymous ? "🔒 Anónima" : "🔓 Pública";

          await interaction.editReply({
            content: `✅ **${typeText} ${modeText} enviada con éxito! (ID: #${confessionId})**`,
          });
        } catch (error: any) {
          console.error("Error publicación:", error);
          await interaction.editReply({
            content: `❌ **Error:** ${error.message || "Algo salió mal al publicar."}`,
          });
        }
        return;
      }

      // --- B) PROCESAR REPORTE ---
      if (interaction.customId.startsWith("reportModal_")) {
        if (!interaction.guildId) return;

        const targetId = interaction.customId.split("_")[1];
        const reason = interaction.fields.getTextInputValue("reportReason");

        await interaction.deferReply({ ephemeral: true });

        try {
          // 1. OBTENER CANAL DE LOGS (Lite)
          const settings = await SettingsManager.getLite(
            interaction.guildId,
            "confessions",
          );

          if (settings && settings.confessions?.logsChannelId) {
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
                    value:
                      "Usa `/confession-check id:" +
                      targetId +
                      "` para investigar.",
                  },
                )
                .setTimestamp();

              await logsChannel.send({
                content: "@here",
                embeds: [alertEmbed],
              });
            }
          }
          await interaction.editReply(
            "✅ **Reporte recibido.** Los administradores han sido notificados.",
          );
        } catch (err) {
          console.error("Error enviando reporte:", err);
          await interaction.editReply("❌ Error al procesar el reporte.");
        }
        return;
      }
    }
  },
};

async function handleCommandError(
  interaction: AnyCtx,
  error: any,
  safeRespond: (ix: AnyCtx, p: any) => Promise<any>,
) {
  let errorMessage = "❌ Nyaa… error interno.";
  if (error?.code === 50013 || error?.code === 50001)
    errorMessage = "❌ Me faltan permisos.";
  try {
    await safeRespond(interaction, { content: errorMessage, ephemeral: true });
  } catch {}
}
