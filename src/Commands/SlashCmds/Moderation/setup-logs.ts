import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ChannelType,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { SettingsManager } from "../../../Database/SettingsManager";
import { PremiumManager } from "../../../Database/PremiumManager";

const FREE_LOGS = ["modlog", "serverlog", "confesslog", "joinlog"];
const PREMIUM_LOGS = ["messagelog", "voicelog", "boostlog", "levellog"];

const LOG_META: Record<string, { label: string; emoji: string; description: string }> = {
  modlog:     { label: "Moderación",         emoji: "⚖️",  description: "Ban, kick, mute, warn (manual + automod)" },
  serverlog:  { label: "Servidor",           emoji: "📋",  description: "Entradas/salidas, roles, canales" },
  confesslog: { label: "Confesiones",        emoji: "🔒",  description: "Confesiones reportadas (privado)" },
  joinlog:    { label: "Entradas",           emoji: "🚪",  description: "Nuevos miembros + detección de alts" },
  messagelog: { label: "Mensajes",           emoji: "✏️",  description: "Mensajes editados/eliminados [PREMIUM]" },
  voicelog:   { label: "Voz",               emoji: "🎙️",  description: "Actividad en canales de voz [PREMIUM]" },
  boostlog:   { label: "Boosts",            emoji: "💎",  description: "Boosts del servidor [PREMIUM]" },
  levellog:   { label: "Niveles",           emoji: "⭐",  description: "Subidas de nivel [PREMIUM]" },
};

const command: SlashCommand = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("📋 Configura los canales de logs de Hoshiko para este servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    const generateUI = async () => {
      const [settings, isPremium] = await Promise.all([
        SettingsManager.getSettings(guildId),
        PremiumManager.isPremium(guildId),
      ]);

      const logChannels = (settings as any).logChannels || {};

      // Construir display de canales configurados
      const freeFields = FREE_LOGS.map((key) => {
        const meta = LOG_META[key];
        const channelId = logChannels[key];
        return `${meta.emoji} **${meta.label}:** ${channelId ? `<#${channelId}>` : "⚠️ Sin configurar"}`;
      }).join("\n");

      const premiumFields = PREMIUM_LOGS.map((key) => {
        const meta = LOG_META[key];
        const channelId = logChannels[key];
        const status = !isPremium ? "🔒 Premium" : channelId ? `<#${channelId}>` : "⚠️ Sin configurar";
        return `${meta.emoji} **${meta.label}:** ${status}`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📋 Configuración de Canales de Logs")
        .setColor(isPremium ? 0xf1c40f : 0xffb6c1)
        .setDescription(
          `Asigna un canal de Discord a cada tipo de log.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`
        )
        .addFields(
          { name: "📌 Logs Básicos", value: freeFields, inline: false },
          { name: "💎 Logs Premium", value: premiumFields, inline: false },
        )
        .setFooter({ text: "Selecciona un log del menú para configurarlo" })
        .setTimestamp();

      // Opciones del menú — premium deshabilitado si no tiene licencia
      const freeOptions = FREE_LOGS.map((key) => ({
        label: LOG_META[key].label,
        value: key,
        emoji: LOG_META[key].emoji,
        description: LOG_META[key].description,
      }));

      const premiumOptions = PREMIUM_LOGS.map((key) => ({
        label: LOG_META[key].label,
        value: key,
        emoji: LOG_META[key].emoji,
        description: isPremium ? LOG_META[key].description : "🔒 Requiere Premium",
      }));

      const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("logs_select")
          .setPlaceholder("Selecciona un tipo de log para configurar...")
          .addOptions([...freeOptions, ...premiumOptions]),
      );

      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("logs_clear_all")
          .setLabel("Limpiar Todo")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("logs_refresh")
          .setLabel("Refrescar")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("logs_close")
          .setLabel("Cerrar")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Secondary),
      );

      return { embeds: [embed], components: [menu, buttons] };
    };

    const message = await interaction.editReply(await generateUI());

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300_000,
    });

    collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
      const isPremium = await PremiumManager.isPremium(guildId);

      // --- MENÚ: seleccionar tipo de log ---
      if (i.isStringSelectMenu() && i.customId === "logs_select") {
        const logKey = i.values[0];

        // Bloquear premium si no tiene licencia
        if (PREMIUM_LOGS.includes(logKey) && !isPremium) {
          await i.reply({
            content: "🔒 Este tipo de log requiere **Premium**.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Mostrar modal para ingresar ID del canal
        const meta = LOG_META[logKey];
        const modal = new ModalBuilder()
          .setCustomId(`logs_modal_${logKey}`)
          .setTitle(`📋 Configurar log: ${meta.label}`);

        const input = new TextInputBuilder()
          .setCustomId("channel_id")
          .setLabel("ID del Canal (deja vacío para desactivar)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ej: 1234567890123456789")
          .setRequired(false);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        await i.showModal(modal);

        try {
          const modalSubmit = await i.awaitModalSubmit({
            filter: (m) => m.customId === `logs_modal_${logKey}` && m.user.id === interaction.user.id,
            time: 120_000,
          });

          const val = modalSubmit.fields.getTextInputValue("channel_id").trim();

          // Validar que sea una ID válida o vacío para desactivar
          if (val && !/^\d{17,20}$/.test(val)) {
            await modalSubmit.reply({ content: "❌ ID de canal inválida.", flags: MessageFlags.Ephemeral });
            return;
          }

          // Verificar que el canal existe en el servidor
          if (val) {
            const channel = interaction.guild!.channels.cache.get(val);
            if (!channel || !channel.isTextBased()) {
              await modalSubmit.reply({ content: "❌ Canal no encontrado o no es un canal de texto.", flags: MessageFlags.Ephemeral });
              return;
            }
          }

          await modalSubmit.deferUpdate();
          await SettingsManager.updateSettings(guildId, {
            [`logChannels.${logKey}`]: val || null,
          } as any);

          await interaction.editReply(await generateUI());
        } catch {
          // Modal expiró o fue cancelado
        }
        return;
      }

      // --- BOTONES ---
      if (i.isButton()) {
        if (i.customId === "logs_close") {
          await i.deferUpdate();
          collector.stop();
          return;
        }

        if (i.customId === "logs_clear_all") {
          await i.deferUpdate();
          const cleared: any = {};
          [...FREE_LOGS, ...PREMIUM_LOGS].forEach((key) => (cleared[`logChannels.${key}`] = null));
          await SettingsManager.updateSettings(guildId, cleared);
          await interaction.editReply(await generateUI());
          return;
        }

        if (i.customId === "logs_refresh") {
          await i.deferUpdate();
          await interaction.editReply(await generateUI());
          return;
        }
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch {}
    });
  },
};

export default command;