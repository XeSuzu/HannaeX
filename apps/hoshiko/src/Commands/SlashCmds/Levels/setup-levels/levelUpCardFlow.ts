import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import LevelConfig, {
  type ILevelConfig,
} from "../../../../Database/leveling/levelConfig.model";
import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import { generateLevelUpBanner } from "../../../../Utils/LevelBanners";
import { handleView } from "./viewFlow";
import { handleCardCustomization } from "./cardFlow";

const LEVELUP_FLOW_TIMEOUT = 120_000;

export async function handleLevelUpCardCustomization(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  initialConfig: ILevelConfig,
): Promise<unknown> {
  const guildId = interaction.guildId!;
  let config = initialConfig;
  let isMilestonePreview = false;

  if (!interaction.deferred && !interaction.replied) {
    if (interaction.isButton()) {
      await interaction.deferUpdate().catch(() => null);
    } else {
      await interaction.deferReply().catch(() => null);
    }
  }

  try {
    // Cargar avatar del usuario o buffer vacío
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
        levelPrefix: "Nivel",
        levelUpBannerMode: "canvas",
        levelUpTitle: "¡NIVEL ALCANZADO!",
        levelUpSubtitle: "¡Felicidades {user}!",
        levelUpBadgeText: "SUBIDA DE RANGO",
        levelUpFooterText: "{guildName}",
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

      const previewBanner = await generateLevelUpBanner({
        username: interaction.user.displayName || interaction.user.username,
        avatarBuffer,
        oldLevel: isMilestonePreview ? 9 : 24,
        newLevel: isMilestonePreview ? 10 : 25,
        guildName: interaction.guild?.name || "Hoshiko Community",
        roleName: isMilestonePreview ? "Tier Diamante" : null,
        isMilestone: isMilestonePreview,
        backgroundTheme: custom.theme || "default",
        customBackgroundBuffer,
        levelPrefix: custom.levelPrefix || "Nivel",
        title: custom.levelUpTitle,
        subtitle: custom.levelUpSubtitle,
        badgeText: custom.levelUpBadgeText,
        footerText: custom.levelUpFooterText,
      });

      const isCanvas = (custom.levelUpBannerMode || "canvas") === "canvas";
      const modeDesc = isCanvas
        ? "🎨 **Canvas (Imagen)** — Banner dinámico de alta resolución (820x250)"
        : "📄 **Embed** — Mensaje embebido tradicional de Discord";

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle("🎉 Personalización de Subida de Nivel (Level Up)")
        .setDescription(
          `Personaliza el diseño y los mensajes que se anuncian cuando los miembros suben de nivel en **${interaction.guild?.name || "este servidor"}**.\n` +
            "La imagen adjunta es una **vista previa en tiempo real** de la tarjeta generada.",
        )
        .addFields(
          {
            name: "📢 Formato de Anuncio",
            value: modeDesc,
            inline: false,
          },
          {
            name: "✏️ Textos Personalizados",
            value:
              `• **Título**: \`${custom.levelUpTitle || "¡NIVEL ALCANZADO!"}\`\n` +
              `• **Felicitación**: \`${custom.levelUpSubtitle || "¡Felicidades {user}!"}\`\n` +
              `• **Medalla / Badge**: \`${custom.levelUpBadgeText || "SUBIDA DE RANGO"}\`\n` +
              `• **Pie de Tarjeta**: \`${custom.levelUpFooterText || "{guildName}"}\``,
            inline: false,
          },
          {
            name: "💡 Variables Disponibles",
            value:
              "`{user}` → Nombre del miembro\n" +
              "`{level}` → Nivel alcanzado\n" +
              "`{role}` → Rol desbloqueado (si aplica)\n" +
              "`{guildName}` → Nombre del servidor",
            inline: true,
          },
          {
            name: "👁️ Vista Previa Actual",
            value: isMilestonePreview
              ? "⭐ **Hito con Rol** (Nivel 10, Rol *Tier Diamante*)"
              : "📈 **Subida Estándar** (Nivel 25)",
            inline: true,
          },
        )
        .setFooter({
          text: "Hoshiko Levels 🌸 • Módulo de Subida de Nivel",
        })
        .setTimestamp();

      if (previewBanner) {
        embed.setImage("attachment://level-up.png");
      }

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lvl_lvlup_btn_mode")
          .setLabel(isCanvas ? "Modo: Canvas" : "Modo: Embed")
          .setEmoji(isCanvas ? "🎨" : "📄")
          .setStyle(isCanvas ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_lvlup_btn_texts")
          .setLabel("Editar Textos")
          .setEmoji("✏️")
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_lvlup_btn_toggle_preview")
          .setLabel(
            isMilestonePreview ? "Vista: Con Rol" : "Vista: Estándar",
          )
          .setEmoji(isMilestonePreview ? "⭐" : "📈")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
      );

      const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lvl_lvlup_btn_back_hub")
          .setLabel("Volver a Tarjetas")
          .setEmoji("🗂️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lvl_lvlup_btn_back_panel")
          .setLabel("Volver al Panel")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
      );

      return {
        embeds: [embed],
        files: previewBanner ? [previewBanner] : [],
        components: [buttonRow, navRow],
      };
    };

    const initialPayload = await renderPayload(config);
    const replyMessage = (await interaction.editReply(initialPayload as any)) as any;

    if (!replyMessage?.createMessageComponentCollector) return;

    const collector = replyMessage.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      idle: LEVELUP_FLOW_TIMEOUT,
    });

    collector.on("collect", async (compInteraction: any) => {
      const customId = compInteraction.customId;

      // 1. Volver al Selector de Tarjetas
      if (customId === "lvl_lvlup_btn_back_hub") {
        collector.stop("nav");
        await compInteraction.deferUpdate();
        return handleCardCustomization(compInteraction, config);
      }

      // 2. Volver al Panel de Niveles
      if (customId === "lvl_lvlup_btn_back_panel") {
        collector.stop("nav");
        await compInteraction.deferUpdate();
        return handleView(compInteraction, "view", config);
      }

      // 3. Alternar Modo (Canvas vs Embed)
      if (customId === "lvl_lvlup_btn_mode") {
        const currentMode = config.cardCustomization?.levelUpBannerMode || "canvas";
        const nextMode = currentMode === "canvas" ? "embed" : "canvas";

        const updated = await LevelConfig.findOneAndUpdate(
          { guildId },
          { $set: { "cardCustomization.levelUpBannerMode": nextMode } },
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

      // 4. Alternar Modo de Vista Previa (Hito vs Estándar)
      if (customId === "lvl_lvlup_btn_toggle_preview") {
        isMilestonePreview = !isMilestonePreview;
        await compInteraction.deferUpdate();
        const newPayload = await renderPayload(config);
        await compInteraction.editReply(newPayload as any);
        return;
      }

      // 5. Editar Textos de Level Up (Modal)
      if (customId === "lvl_lvlup_btn_texts") {
        const modal = new ModalBuilder()
          .setCustomId("lvl_modal_lvlup_texts")
          .setTitle("🎉 Textos Subida de Nivel");

        const titleInput = new TextInputBuilder()
          .setCustomId("txt_lvlup_title")
          .setLabel("Título (ej: ¡NIVEL ALCANZADO!)")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.levelUpTitle || "¡NIVEL ALCANZADO!")
          .setMaxLength(30)
          .setRequired(false);

        const subInput = new TextInputBuilder()
          .setCustomId("txt_lvlup_sub")
          .setLabel("Felicitación ({user}, {level}, {role})")
          .setStyle(TextInputStyle.Short)
          .setValue(
            config.cardCustomization?.levelUpSubtitle || "¡Felicidades {user}!",
          )
          .setMaxLength(45)
          .setRequired(false);

        const badgeInput = new TextInputBuilder()
          .setCustomId("txt_lvlup_badge")
          .setLabel("Texto Medalla (ej: SUBIDA DE RANGO)")
          .setStyle(TextInputStyle.Short)
          .setValue(
            config.cardCustomization?.levelUpBadgeText || "SUBIDA DE RANGO",
          )
          .setMaxLength(25)
          .setRequired(false);

        const footerInput = new TextInputBuilder()
          .setCustomId("txt_lvlup_footer")
          .setLabel("Pie de Tarjeta ({guildName})")
          .setStyle(TextInputStyle.Short)
          .setValue(config.cardCustomization?.levelUpFooterText || "{guildName}")
          .setMaxLength(40)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(subInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(badgeInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput),
        );

        await compInteraction.showModal(modal);

        try {
          const modalSubmit = await compInteraction.awaitModalSubmit({
            filter: (m: any) =>
              m.customId === "lvl_modal_lvlup_texts" &&
              m.user.id === interaction.user.id,
            time: 120_000,
          });

          const titleVal =
            modalSubmit.fields.getTextInputValue("txt_lvlup_title").trim() ||
            "¡NIVEL ALCANZADO!";
          const subVal =
            modalSubmit.fields.getTextInputValue("txt_lvlup_sub").trim() ||
            "¡Felicidades {user}!";
          const badgeVal =
            modalSubmit.fields.getTextInputValue("txt_lvlup_badge").trim() ||
            "SUBIDA DE RANGO";
          const footerVal =
            modalSubmit.fields.getTextInputValue("txt_lvlup_footer").trim() ||
            "{guildName}";

          const updated = await LevelConfig.findOneAndUpdate(
            { guildId },
            {
              $set: {
                "cardCustomization.levelUpTitle": titleVal,
                "cardCustomization.levelUpSubtitle": subVal,
                "cardCustomization.levelUpBadgeText": badgeVal,
                "cardCustomization.levelUpFooterText": footerVal,
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
    console.error("[levelUpCardFlow] Error en handleLevelUpCardCustomization:", err);
    await interaction
      .editReply({
        content:
          "⚠️ Ocurrió un error al cargar la personalización de Subida de Nivel. Intenta nuevamente.",
        components: [],
      })
      .catch(() => null);
  }
}
