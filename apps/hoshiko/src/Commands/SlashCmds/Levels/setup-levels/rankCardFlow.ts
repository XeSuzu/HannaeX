import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import LevelConfig, {
  type ILevelConfig,
} from "../../../../Database/leveling/levelConfig.model";
import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import {
  generateServerRankBanner,
  LEVEL_CARD_THEMES,
} from "../../../../Utils/LevelBanners";
import { handleView } from "./viewFlow";
import { handleCardCustomization } from "./cardFlow";

const RANK_FLOW_TIMEOUT = 120_000;

export async function handleRankCardCustomization(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  initialConfig: ILevelConfig,
): Promise<unknown> {
  const guildId = interaction.guildId!;
  let config = initialConfig;

  if (!interaction.deferred && !interaction.replied) {
    if (interaction.isButton()) {
      await interaction.deferUpdate().catch(() => null);
    } else {
      await interaction.deferReply().catch(() => null);
    }
  }

  try {
    // Cargar avatar del usuario o usar fallback transparente/básico
    let avatarBuffer: Buffer;
    try {
      const avatarUrl = interaction.user.displayAvatarURL({
        extension: "png",
        size: 256,
      });
      const res = await fetch(avatarUrl);
      if (res.ok) {
        avatarBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        avatarBuffer = Buffer.alloc(0);
      }
    } catch {
      avatarBuffer = Buffer.alloc(0);
    }

    const renderPayload = async (cfg: ILevelConfig, disabled = false) => {
      const custom = cfg.cardCustomization ?? {
        theme: "default",
        customBackgroundUrl: null,
        enforced: false,
        levelPrefix: "Nivel",
        badgeSubtitle: null,
        panelTopText: "TOP",
        panelBottomText: "SERVIDOR",
      };

      let customBackgroundBuffer: Buffer | null = null;
      if (custom.customBackgroundUrl) {
        try {
          const bgRes = await fetch(custom.customBackgroundUrl);
          if (bgRes.ok) {
            customBackgroundBuffer = Buffer.from(await bgRes.arrayBuffer());
          }
        } catch {
          customBackgroundBuffer = null;
        }
      }

      const previewBanner = await generateServerRankBanner({
        username: interaction.user.displayName || interaction.user.username,
        avatarBuffer,
        level: 25,
        rank: 1,
        xpCurrent: 4500,
        xpNeeded: 5200,
        progressPercent: 86,
        messagesSent: 1420,
        voiceMinutes: 340,
        voiceLevel: 12,
        backgroundTheme: custom.theme || "default",
        customBackgroundBuffer,
        levelPrefix: custom.levelPrefix || "Nivel",
        panelTopText: custom.panelTopText || "TOP",
        panelBottomText: custom.panelBottomText || "SERVIDOR",
        badgeSubtitle: custom.badgeSubtitle || "★ Vista Previa Servidor",
      });

      const activeTheme =
        LEVEL_CARD_THEMES[custom.theme || "default"] ?? LEVEL_CARD_THEMES.default;
      const bgDescription = custom.customBackgroundUrl
        ? `🖼️ Imagen personalizada ([Ver enlace](${custom.customBackgroundUrl}))`
        : `${activeTheme.emoji} **${activeTheme.name}**`;

      const enforceText = custom.enforced
        ? "🔒 **Forzado para todos los miembros** (se ignora su fondo personal)"
        : "🔓 **Opcional / Predeterminado** (los miembros pueden elegir su propio fondo)";

      const embed = new EmbedBuilder()
        .setColor(0xec4899)
        .setTitle("💳 Personalización de Tarjeta /rank")
        .setDescription(
          `Configura el diseño visual y los textos de la tarjeta de rango para **${interaction.guild?.name || "este servidor"}**.\n` +
            "La imagen adjunta es una **vista previa en tiempo real** de cómo lucirá para los miembros.",
        )
        .addFields(
          {
            name: "🎨 Fondo Activo",
            value: bgDescription,
            inline: true,
          },
          {
            name: "🔒 Modo de Servidor",
            value: enforceText,
            inline: true,
          },
          {
            name: "✏️ Textos de Tarjeta",
            value:
              `• **Prefijo de Nivel**: \`${custom.levelPrefix || "Nivel"}\`\n` +
              `• **Panel Superior**: \`${custom.panelTopText || "TOP"}\`\n` +
              `• **Panel Inferior**: \`${custom.panelBottomText || "SERVIDOR"}\`\n` +
              `• **Subtítulo / Lema**: \`${custom.badgeSubtitle || "(Predeterminado)"}\``,
            inline: false,
          },
        )
        .setFooter({ text: "Hoshiko Levels 🌸 • Módulo de Tarjeta /rank" })
        .setTimestamp();

      if (previewBanner) {
        embed.setImage("attachment://server-rank.png");
      }

      // Menú de Selección de Temas Oficiales
      const themeOptions = Object.values(LEVEL_CARD_THEMES).map((theme) => ({
        label: theme.name,
        value: theme.id,
        description: theme.description.slice(0, 50),
        emoji: theme.emoji,
        default: !custom.customBackgroundUrl && (custom.theme || "default") === theme.id,
      }));

      if (custom.customBackgroundUrl) {
        themeOptions.push({
          label: "Eliminar Imagen Propia",
          value: "reset_custom_bg",
          description: "Quita la URL personalizada y vuelve a un tema de color.",
          emoji: "🗑️",
          default: false,
        });
      }

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("lvl_rank_sel_theme")
          .setPlaceholder("Selecciona un tema predeterminado...")
          .addOptions(themeOptions)
          .setDisabled(disabled),
      );

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lvl_rank_btn_bg")
          .setLabel("Fondo Personalizado")
          .setEmoji("🖼️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_rank_btn_texts")
          .setLabel("Editar Textos")
          .setEmoji("✏️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_rank_btn_enforce")
          .setLabel(custom.enforced ? "Forzar: On" : "Forzar: Off")
          .setEmoji(custom.enforced ? "🔒" : "🔓")
          .setStyle(custom.enforced ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(disabled),
      );

      const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lvl_rank_btn_back_hub")
          .setLabel("Volver a Tarjetas")
          .setEmoji("🗂️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_rank_btn_back_panel")
          .setLabel("Volver al Panel")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
      );

      return {
        embeds: [embed],
        files: previewBanner ? [previewBanner] : [],
        components: [selectRow, buttonRow, navRow],
      };
    };

    const initialPayload = await renderPayload(config);
    const replyMessage = (await interaction.editReply(initialPayload as any)) as any;

    if (!replyMessage?.createMessageComponentCollector) return;

    const collector = replyMessage.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      idle: RANK_FLOW_TIMEOUT,
    });

    collector.on("collect", async (compInteraction: any) => {
      const customId = compInteraction.customId;

      // 1. Selector de Tema
      if (customId === "lvl_rank_sel_theme" && compInteraction.isStringSelectMenu()) {
        const selected = compInteraction.values[0];
        let updateSet: Record<string, any> = {};

        if (selected === "reset_custom_bg") {
          updateSet = {
            "cardCustomization.customBackgroundUrl": null,
          };
        } else if (LEVEL_CARD_THEMES[selected]) {
          updateSet = {
            "cardCustomization.theme": selected,
            "cardCustomization.customBackgroundUrl": null,
          };
        }

        const updated = await LevelConfig.findOneAndUpdate(
          { guildId },
          { $set: updateSet },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        if (updated) {
          config = updated;
          LevelConfigCache.invalidate(guildId);
        }

        await compInteraction.deferUpdate();
        const newPayload = await renderPayload(config);
        await compInteraction.editReply(newPayload as any);
        return;
      }

      // 2. Volver al Hub de Tarjetas
      if (customId === "lvl_rank_btn_back_hub") {
        collector.stop("nav");
        await compInteraction.deferUpdate();
        return handleCardCustomization(compInteraction, config);
      }

      // 3. Volver al Panel Principal de Niveles
      if (customId === "lvl_rank_btn_back_panel") {
        collector.stop("nav");
        await compInteraction.deferUpdate();
        return handleView(compInteraction, "view", config);
      }

      // 4. Alternar Forzar Fondo
      if (customId === "lvl_rank_btn_enforce") {
        const currentEnforced = config.cardCustomization?.enforced ?? false;
        const updated = await LevelConfig.findOneAndUpdate(
          { guildId },
          { $set: { "cardCustomization.enforced": !currentEnforced } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        if (updated) {
          config = updated;
          LevelConfigCache.invalidate(guildId);
        }
        await compInteraction.deferUpdate();
        const newPayload = await renderPayload(config);
        await compInteraction.editReply(newPayload as any);
        return;
      }

      // 5. Fondo URL Personalizado (Modal)
      if (customId === "lvl_rank_btn_bg") {
        const modal = new ModalBuilder()
          .setCustomId("lvl_modal_rank_custom_bg")
          .setTitle("🖼️ Fondo Personalizado /rank");

        const urlInput = new TextInputBuilder()
          .setCustomId("custom_bg_url")
          .setLabel("URL de imagen (PNG, JPG, WEBP) o vacío")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://ejemplo.com/fondo.png")
          .setValue(config.cardCustomization?.customBackgroundUrl || "")
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
        );
        await compInteraction.showModal(modal);

        try {
          const modalSubmit = await compInteraction.awaitModalSubmit({
            filter: (m: any) =>
              m.customId === "lvl_modal_rank_custom_bg" &&
              m.user.id === interaction.user.id,
            time: 120_000,
          });

          const rawUrl = modalSubmit.fields
            .getTextInputValue("custom_bg_url")
            .trim();
          const validUrl =
            rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
              ? rawUrl
              : null;

          const updated = await LevelConfig.findOneAndUpdate(
            { guildId },
            { $set: { "cardCustomization.customBackgroundUrl": validUrl } },
            { new: true, upsert: true, setDefaultsOnInsert: true },
          );
          if (updated) {
            config = updated;
            LevelConfigCache.invalidate(guildId);
          }

          await modalSubmit.deferUpdate();
          const newPayload = await renderPayload(config);
          await modalSubmit.editReply(newPayload as any);
        } catch {
          // Modal cancelado o expirado
        }
        return;
      }

      // 6. Editar Textos /rank (Modal)
      if (customId === "lvl_rank_btn_texts") {
        const modal = new ModalBuilder()
          .setCustomId("lvl_modal_rank_texts")
          .setTitle("✏️ Editar Textos /rank");

        const prefixInput = new TextInputBuilder()
          .setCustomId("txt_prefix")
          .setLabel("Prefijo de Nivel (ej: Nivel, Rango, Tier)")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.levelPrefix || "Nivel")
          .setMaxLength(15)
          .setRequired(false);

        const topInput = new TextInputBuilder()
          .setCustomId("txt_top")
          .setLabel("Panel Superior (ej: TOP, #)")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.panelTopText || "TOP")
          .setMaxLength(12)
          .setRequired(false);

        const bottomInput = new TextInputBuilder()
          .setCustomId("txt_bottom")
          .setLabel("Panel Inferior (ej: SERVIDOR, CLAN)")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.panelBottomText || "SERVIDOR")
          .setMaxLength(12)
          .setRequired(false);

        const subtitleInput = new TextInputBuilder()
          .setCustomId("txt_subtitle")
          .setLabel("Subtítulo / Lema (vacío para global)")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.badgeSubtitle || "")
          .setMaxLength(35)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(prefixInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(topInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(bottomInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(subtitleInput),
        );

        await compInteraction.showModal(modal);

        try {
          const modalSubmit = await compInteraction.awaitModalSubmit({
            filter: (m: any) =>
              m.customId === "lvl_modal_rank_texts" &&
              m.user.id === interaction.user.id,
            time: 120_000,
          });

          const prefixVal =
            modalSubmit.fields.getTextInputValue("txt_prefix").trim() || "Nivel";
          const topVal =
            modalSubmit.fields.getTextInputValue("txt_top").trim() || "TOP";
          const bottomVal =
            modalSubmit.fields.getTextInputValue("txt_bottom").trim() ||
            "SERVIDOR";
          const subtitleVal =
            modalSubmit.fields.getTextInputValue("txt_subtitle").trim() || null;

          const updated = await LevelConfig.findOneAndUpdate(
            { guildId },
            {
              $set: {
                "cardCustomization.levelPrefix": prefixVal,
                "cardCustomization.panelTopText": topVal,
                "cardCustomization.panelBottomText": bottomVal,
                "cardCustomization.badgeSubtitle": subtitleVal,
              },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true },
          );
          if (updated) {
            config = updated;
            LevelConfigCache.invalidate(guildId);
          }

          await modalSubmit.deferUpdate();
          const newPayload = await renderPayload(config);
          await modalSubmit.editReply(newPayload as any);
        } catch {
          // Modal cancelado o expirado
        }
        return;
      }
    });

    collector.on("end", async (_collected: any, reason: string) => {
      if (reason === "nav") return;
      const finalDisabled = await renderPayload(config, true);
      await interaction.editReply(finalDisabled as any).catch(() => null);
    });
  } catch (err) {
    console.error("[rankCardFlow] Error en handleRankCardCustomization:", err);
    await interaction
      .editReply({
        content:
          "⚠️ Ocurrió un error al cargar la personalización de la tarjeta /rank. Intenta nuevamente.",
        components: [],
      })
      .catch(() => null);
  }
}
