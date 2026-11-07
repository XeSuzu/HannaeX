import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import LevelConfig, { type ILevelConfig } from "../../../../Database/leveling/levelConfig.model";
import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import { handleCardCustomization } from "./cardFlow";

const VIEW_TIMEOUT = 90_000;

export async function handleView(
  interaction: ChatInputCommandInteraction,
  sub: string,
  initialConfig: ILevelConfig,
): Promise<unknown> {
  if (sub !== "view") return;

  let config = initialConfig;
  const guildId = interaction.guildId!;

  const renderPayload = (cfg: ILevelConfig, disabled = false) => {
    const announceModeText = {
      all: "Todos los niveles",
      milestone: "Solo niveles importantes",
      silent: "Silencioso",
    }[cfg.announceMode || "milestone"];

    const systemStatus = cfg.enabled ? "🟢 **Activado**" : "🔴 **Desactivado**";
    const voiceStatus = cfg.xpVoiceEnabled ? "🟢 Activado" : "🔴 Desactivado";
    const dmStatus = cfg.announceDM ? "🟢 Activado" : "🔴 Desactivado";
    const botsStatus = cfg.ignoreBots ? "🟢 Ignorados" : "🔴 Contados";

    const embed = new EmbedBuilder()
      .setColor(cfg.enabled ? 0x51cf66 : 0xff6b6b)
      .setTitle("⚙️ Panel Interactivo de Niveles")
      .setDescription(
        `Estado del sistema: **${systemStatus}**\n` +
          (cfg.enabled
            ? "💡 Los usuarios están ganando XP activamente en este servidor."
            : "⚠️ El sistema está desactivado. Puedes activarlo con el botón inferior."),
      )
      .addFields(
        {
          name: "📢 Anuncios",
          value: announceModeText,
          inline: true,
        },
        {
          name: "📨 Anuncio DM",
          value: dmStatus,
          inline: true,
        },
        {
          name: "💬 XP por mensaje",
          value:
            `\`${cfg.xpPerMessage}\` XP\n` +
            `Cooldown: \`${cfg.xpCooldown}s\`\n` +
            `Mínimo: \`${cfg.xpMinLength}\` letras`,
          inline: true,
        },
        {
          name: "🎁 Bonus de mención",
          value:
            `+${cfg.xpMentionBonus} XP/mención\n` +
            `Máximo: ${cfg.xpMentionMaxBonus} XP\n` +
            `Multiplicador: x${cfg.xpMultiplier}`,
          inline: true,
        },
        {
          name: "🔊 XP por voz",
          value:
            voiceStatus +
            "\n" +
            (cfg.xpVoiceEnabled
              ? `\`${cfg.xpPerMinuteVoice}\` XP/min\nMínimo: \`${cfg.xpVoiceMinMinutes}\` min`
              : ""),
          inline: true,
        },
        {
          name: "🤖 Bots",
          value: botsStatus,
          inline: true,
        },
      );

    if (cfg.announceChannelId) {
      embed.addFields({
        name: "📢 Canal de anuncio",
        value: `<#${cfg.announceChannelId}>`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📢 Canal de anuncio",
        value: "No configurado (se anunciará en el canal donde suba de nivel).",
        inline: false,
      });
    }

    if (cfg.ignoredChannels.length > 0) {
      embed.addFields({
        name: "🚫 Canales ignorados",
        value: cfg.ignoredChannels.map((c) => `<#${c}>`).join(", "),
        inline: false,
      });
    }

    if (cfg.ignoredRoles.length > 0) {
      embed.addFields({
        name: "🚫 Roles ignorados",
        value: cfg.ignoredRoles.map((r) => `<@&${r}>`).join(", "),
        inline: false,
      });
    }

    const levelRolesCount = cfg.levelRoles.length;
    embed.addFields({
      name: "🎖️ Roles por nivel",
      value:
        levelRolesCount > 0
          ? `${levelRolesCount} rol(es) configurado(s) (Usa \`/level-roles list\` para verlos)`
          : "Ninguno configurado",
      inline: true,
    });

    embed.setFooter({ text: "Hoshiko Levels 🌸 • Ajustes en tiempo real" }).setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("lvl_btn_toggle")
        .setLabel(cfg.enabled ? "Sistema: Activado" : "Sistema: Desactivado")
        .setEmoji(cfg.enabled ? "🟢" : "🔴")
        .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_btn_voice")
        .setLabel(cfg.xpVoiceEnabled ? "Voz: Activada" : "Voz: Desactivada")
        .setEmoji("🎙️")
        .setStyle(cfg.xpVoiceEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_btn_dm")
        .setLabel(cfg.announceDM ? "DM: Activado" : "DM: Desactivado")
        .setEmoji("📨")
        .setStyle(cfg.announceDM ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_btn_cycle_mode")
        .setLabel(`Modo: ${cfg.announceMode || "milestone"}`)
        .setEmoji("📢")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lvl_btn_card")
        .setLabel("Personalizar Card")
        .setEmoji("🎨")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
    );

    return { embeds: [embed], components: [row], files: [] };
  };

  const initialPayload = renderPayload(config);
  const replyMessage = (await interaction.editReply(initialPayload as any)) as any;

  if (!replyMessage?.createMessageComponentCollector) return;

  const collector = replyMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i: any) => i.user.id === interaction.user.id,
    idle: VIEW_TIMEOUT,
  });

  collector.on("collect", async (btnInteraction: any) => {
    const id = btnInteraction.customId;

    if (id === "lvl_btn_card") {
      collector.stop("card");
      await btnInteraction.deferUpdate().catch(() => null);
      return handleCardCustomization(btnInteraction, config);
    }

    let updateSet: Record<string, any> = {};

    if (id === "lvl_btn_toggle") {
      updateSet = { enabled: !config.enabled };
    } else if (id === "lvl_btn_voice") {
      updateSet = { xpVoiceEnabled: !config.xpVoiceEnabled };
    } else if (id === "lvl_btn_dm") {
      updateSet = { announceDM: !config.announceDM };
    } else if (id === "lvl_btn_cycle_mode") {
      const modes: Array<"milestone" | "all" | "silent"> = ["milestone", "all", "silent"];
      const nextIdx = (modes.indexOf(config.announceMode || "milestone") + 1) % modes.length;
      updateSet = { announceMode: modes[nextIdx] };
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

    await btnInteraction.update(renderPayload(config) as any);
  });

  collector.on("end", async (_collected: any, reason: string) => {
    if (reason === "card") return;
    await interaction
      .editReply(renderPayload(config, true) as any)
      .catch(() => null);
  });
}
