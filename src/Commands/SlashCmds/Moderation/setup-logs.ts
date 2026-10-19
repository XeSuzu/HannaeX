import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { PremiumManager } from "../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { SlashCommand } from "../../../Interfaces/Command";

const FREE_LOGS = ["all", "modlog", "serverlog", "confesslog", "joinlog"];
const PREMIUM_LOGS = ["messagelog", "voicelog", "boostlog", "levellog"];

const LOG_META: Record<
  string,
  { label: string; emoji: string; description: string }
> = {
  all: {
    label: "General (Fallback)",
    emoji: "📚",
    description: "Canal general para todos los logs básicos no asignados",
  },
  modlog: {
    label: "Moderación",
    emoji: "⚖️",
    description: "Ban, kick, mute, warn y Centro de Comando interactivo",
  },
  serverlog: {
    label: "Servidor",
    emoji: "📋",
    description: "Cambios de roles, canales y configuración con auditoría",
  },
  confesslog: {
    label: "Confesiones",
    emoji: "🔒",
    description: "Auditoría privada de confesiones y reportes",
  },
  joinlog: {
    label: "Entradas / Salidas",
    emoji: "🚪",
    description: "Nuevos miembros, bajas, Auto-Join y Anti-Alt",
  },
  messagelog: {
    label: "Mensajes",
    emoji: "✏️",
    description: "Mensajes editados, eliminados y purgas [PREMIUM]",
  },
  voicelog: {
    label: "Voz",
    emoji: "🎙️",
    description: "Entradas, salidas y movimientos de voz [PREMIUM]",
  },
  boostlog: {
    label: "Boosts",
    emoji: "💎",
    description: "Nuevos boosts y cambios de nivel del servidor [PREMIUM]",
  },
  levellog: {
    label: "Niveles",
    emoji: "⭐",
    description: "Registro de subidas de nivel [PREMIUM]",
  },
};

const command: SlashCommand = {
  category: "Moderation",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription(
      "📋 Configura los canales de logs de Hoshiko para este servidor.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;
    let selectedLogKey: string | null = null;

    const generateUI = async () => {
      const [settings, isPremium] = await Promise.all([
        SettingsManager.getSettings(guildId),
        PremiumManager.isPremium(guildId),
      ]);

      const logChannels = (settings as any).logChannels || {};

      // ─── SUBVISTA: SELECCIONAR CANAL ESPECÍFICO ──────────────────────────
      if (selectedLogKey && LOG_META[selectedLogKey]) {
        const meta = LOG_META[selectedLogKey];
        const currentChannelId = logChannels[selectedLogKey];

        const embed = new EmbedBuilder()
          .setTitle(`${meta.emoji} Configurar Log: ${meta.label}`)
          .setColor(0x5865f2)
          .setDescription(
            `${meta.description}\n\n**Estado actual:** ${currentChannelId ? `<#${currentChannelId}>` : "⚠️ Sin configurar"}\n\nSelecciona un canal de texto en el menú desplegable inferior o desactívalo con el botón.`,
          )
          .setFooter({ text: "Hoshiko Logger • Selector Nativo de Canales" });

        const channelRow =
          new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`logs_ch_select_${selectedLogKey}`)
              .setPlaceholder(`Elige el canal para ${meta.label}...`)
              .setChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
              ),
          );

        const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_back")
            .setLabel("<- Volver")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`logs_disable_${selectedLogKey}`)
            .setLabel("Desactivar este log")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!currentChannelId),
        );

        return { embeds: [embed], components: [channelRow, navRow] };
      }

      // ─── VISTA PRINCIPAL ─────────────────────────────────────────────────
      const freeFields = FREE_LOGS.map((key) => {
        const meta = LOG_META[key];
        const channelId = logChannels[key];
        return `${meta.emoji} **${meta.label}:** ${channelId ? `<#${channelId}>` : "⚠️ *Sin configurar*"}`;
      }).join("\n");

      const premiumFields = PREMIUM_LOGS.map((key) => {
        const meta = LOG_META[key];
        const channelId = logChannels[key];
        const status = !isPremium
          ? "🔒 *Premium*"
          : channelId
            ? `<#${channelId}>`
            : "⚠️ *Sin configurar*";
        return `${meta.emoji} **${meta.label}:** ${status}`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📋 Configuración de Canales de Logs")
        .setColor(isPremium ? 0xf1c40f : 0xffb7c5)
        .setDescription(
          `Asigna un canal de Discord a cada categoría de auditoría.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
        )
        .addFields(
          { name: "📌 Logs Básicos", value: freeFields, inline: true },
          { name: "💎 Logs Premium", value: premiumFields, inline: true },
        )
        .setFooter({
          text: "Selecciona una categoría del menú para elegir su canal",
        })
        .setTimestamp();

      const freeOptions = FREE_LOGS.map((key) => ({
        label: LOG_META[key].label,
        value: key,
        emoji: LOG_META[key].emoji,
        description: LOG_META[key].description.slice(0, 100),
      }));

      const premiumOptions = PREMIUM_LOGS.map((key) => ({
        label: LOG_META[key].label,
        value: key,
        emoji: LOG_META[key].emoji,
        description: isPremium
          ? LOG_META[key].description.slice(0, 100)
          : "🔒 Requiere suscripción Premium",
      }));

      const menu =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
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
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("logs_close")
          .setLabel("Salir")
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

    collector.on(
      "collect",
      async (
        i:
          | ButtonInteraction
          | StringSelectMenuInteraction
          | ChannelSelectMenuInteraction,
      ) => {
        try {
          await i.deferUpdate();
        } catch {
          return;
        }
        const isPremium = await PremiumManager.isPremium(guildId);

        // 1. Selección de categoría en el menú principal
        if (i.isStringSelectMenu() && i.customId === "logs_select") {
          const logKey = i.values[0];
          if (PREMIUM_LOGS.includes(logKey) && !isPremium) {
            await i.followUp({
              content: "🔒 Esta categoría de log requiere **Premium**.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          selectedLogKey = logKey;
          await interaction.editReply(await generateUI());
          return;
        }

        // 2. Selección del canal en la subvista
        if (
          i.isChannelSelectMenu() &&
          i.customId.startsWith("logs_ch_select_")
        ) {
          const logKey = i.customId.replace("logs_ch_select_", "");
          const chosenChannelId = i.values[0];

          const updatePayload: Record<string, any> = {
            [`logChannels.${logKey}`]: chosenChannelId,
          };
          if (logKey === "confesslog") {
            updatePayload["confessions.logsChannelId"] = chosenChannelId;
          }

          await SettingsManager.updateSettings(guildId, updatePayload as any);
          selectedLogKey = null;
          await interaction.editReply(await generateUI());
          return;
        }

        // 3. Botones
        if (i.isButton()) {
          if (i.customId === "logs_close") {
            collector.stop();
            return;
          }

          if (i.customId === "logs_back" || i.customId === "logs_refresh") {
            selectedLogKey = null;
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId.startsWith("logs_disable_")) {
            const logKey = i.customId.replace("logs_disable_", "");
            const updatePayload: Record<string, any> = {
              [`logChannels.${logKey}`]: null,
            };
            if (logKey === "confesslog") {
              updatePayload["confessions.logsChannelId"] = null;
            }
            await SettingsManager.updateSettings(guildId, updatePayload as any);
            selectedLogKey = null;
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_clear_all") {
            const cleared: any = {};
            [...FREE_LOGS, ...PREMIUM_LOGS].forEach(
              (key) => (cleared[`logChannels.${key}`] = null),
            );
            await SettingsManager.updateSettings(guildId, cleared);
            selectedLogKey = null;
            await interaction.editReply(await generateUI());
            return;
          }
        }
      },
    );

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch {}
    });
  },
};

export default command;