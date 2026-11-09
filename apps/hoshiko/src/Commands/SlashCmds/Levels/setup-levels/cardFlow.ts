import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { ILevelConfig } from "../../../../Database/leveling/levelConfig.model";
import { handleRankCardCustomization } from "./rankCardFlow";
import { handleLevelUpCardCustomization } from "./levelUpCardFlow";
import { handleView } from "./viewFlow";

const HUB_TIMEOUT = 120_000;

export async function handleCardCustomization(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  initialConfig: ILevelConfig,
): Promise<unknown> {
  const guildName = interaction.guild?.name || "este servidor";
  const config = initialConfig;

  if (!interaction.deferred && !interaction.replied) {
    if (interaction.isButton()) {
      await interaction.deferUpdate().catch(() => null);
    } else {
      await interaction.deferReply().catch(() => null);
    }
  }

  const renderHubPayload = (disabled = false) => {
    const embed = new EmbedBuilder()
      .setColor(0xec4899)
      .setTitle("🎨 Centro de Personalización de Tarjetas")
      .setDescription(
        `Configura el aspecto visual y los mensajes del sistema de niveles en **${guildName}**.\n\n` +
          `Para mantener un control claro y detallado, las tarjetas se configuran en **módulos independientes** con vista previa en tiempo real:\n\n` +
          `💳 **1. Tarjeta de Rango (\`/rank\`)**\n` +
          `• Vista previa en vivo del banner de perfil (900x300)\n` +
          `• Selección de temas cromáticos oficiales o imagen propia por URL\n` +
          `• Textos de nivel, prefijos de panel y lema personalizado\n` +
          `• Modo de forzado obligatorio para el servidor u opcional\n\n` +
          `🎉 **2. Tarjeta de Subida de Nivel (\`Level Up\`)**\n` +
          `• Vista previa en vivo del banner interactivo Canvas (820x250)\n` +
          `• Formato de anuncio configurable: **Canvas (Imagen)** o **Embed tradicional**\n` +
          `• Textos de felicitación dinámicos con variables (\`{user}\`, \`{level}\`, \`{role}\`, \`{guildName}\`)\n` +
          `• Simulador de vista previa de subida estándar vs hito con nuevo rol desbloqueado`,
      )
      .setFooter({
        text: "Hoshiko Levels 🌸 • Elige un módulo para comenzar",
      })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("lvl_hub_btn_rank")
        .setLabel("Tarjeta /rank")
        .setEmoji("💳")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_hub_btn_lvlup")
        .setLabel("Subida de Nivel (Level Up)")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_hub_btn_back")
        .setLabel("Volver al Panel")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );

    return {
      embeds: [embed],
      components: [buttons],
      files: [],
    };
  };

  const initialPayload = renderHubPayload();
  const replyMessage = (await interaction.editReply(initialPayload as any)) as any;

  if (!replyMessage?.createMessageComponentCollector) return;

  const collector = replyMessage.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    idle: HUB_TIMEOUT,
  });

  collector.on("collect", async (compInteraction: any) => {
    const id = compInteraction.customId;

    if (id === "lvl_hub_btn_rank") {
      collector.stop("nav");
      await compInteraction.deferUpdate();
      return handleRankCardCustomization(compInteraction, config);
    }

    if (id === "lvl_hub_btn_lvlup") {
      collector.stop("nav");
      await compInteraction.deferUpdate();
      return handleLevelUpCardCustomization(compInteraction, config);
    }

    if (id === "lvl_hub_btn_back") {
      collector.stop("nav");
      await compInteraction.deferUpdate();
      return handleView(compInteraction, "view", config);
    }
  });

  collector.on("end", async (_collected: any, reason: string) => {
    if (reason === "nav") return;
    await interaction.editReply(renderHubPayload(true) as any).catch(() => null);
  });
}
