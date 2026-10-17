import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { IAConfigManager } from "../../../../Database/ai/IAConfigManager";
import { PremiumManager } from "../../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../../Database/guild/SettingsManager";

const GLOBAL_BANNER =
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

export async function generateSetupUI(
  guildId: string,
  channelId: string,
  clientUser: any,
  interactionUser: any,
  specificMenu: ActionRowBuilder<StringSelectMenuBuilder> | null = null,
) {
  const [set, aiSet, isPremium] = await Promise.all([
    SettingsManager.getSettings(guildId),
    IAConfigManager.getConfig(guildId),
    PremiumManager.isPremium(guildId),
  ]);

  const modules = set?.securityModules || {
    antiRaid: false,
    antiLinks: false,
    snipe: false,
  };
  const aiSys = aiSet.aiSystem || {
    mode: "neko",
    behavior: "normal",
    spontaneousChannels: [],
  };

  const currentBehavior = (aiSys.behavior || "normal").toLowerCase();
  let behaviorDisplay = "";
  let safetyDisplay = "";

  switch (currentBehavior) {
    case "agresivo":
      behaviorDisplay = "😈 AGRESIVO (Tóxico)";
      safetyDisplay = "⚠️ Mínimo (Sin censura)";
      break;
    case "pesado":
      behaviorDisplay = "😒 PESADO (Sarcástico)";
      safetyDisplay = "⚖️ Medio (Permite bromas)";
      break;
    default:
      behaviorDisplay = "😇 NORMAL (Amigable)";
      safetyDisplay = "🛡️ Robusto (Family Friendly)";
  }

  const isSpontaneousHere = (aiSys.spontaneousChannels || []).includes(
    channelId,
  );
  const modlogChannel = set?.logChannels?.modlog ?? set?.modLogChannel ?? null;
  const logsDisplay = modlogChannel
    ? `<#${modlogChannel}>`
    : "⚠️ Sin configurar — usa `/setup-logs`";

  const embed = new EmbedBuilder()
    .setTitle("｡･:* 🐾 **CONFIGURACIÓN DEL NÚCLEO** *:･ﾟ")
    .setDescription(
      `Ajusta mis niveles de seguridad y personalidad.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
    )
    .setColor(
      currentBehavior === "agresivo"
        ? 0xff0000
        : currentBehavior === "pesado"
          ? 0xffa500
          : 0xffb6c1,
    )
    .setThumbnail(clientUser?.displayAvatarURL() || null)
    .addFields(
      {
        name: "🧠 **NIVEL DE COMPORTAMIENTO (IA)**",
        value: `> 🎭 **Modo Actual:** \`${behaviorDisplay}\`\n> 🛡️ **Filtro IA:** \`${safetyDisplay}\`\n> *El filtro se ajusta automáticamente según el modo.*`,
        inline: false,
      },
      {
        name: "🛡️ **SEGURIDAD DEL SERVIDOR**",
        value: `> ⚔️ **Anti-Raid:** ${modules.antiRaid ? "✅ ON" : "❌ OFF"}\n> 🔗 **Anti-Links:** ${modules.antiLinks ? "✅ ON" : "❌ OFF"}\n> 🕵️ **Snipe:** ${modules.snipe ? "✅ ON" : "❌ OFF"}\n> 📝 **Logs:** ${logsDisplay}`,
        inline: true,
      },
      {
        name: "🗣️ **CHAT ESPONTÁNEO**",
        value: `> 📍 **En este canal:** ${isSpontaneousHere ? "✅ HABLANDO" : "🔇 CALLADA"}`,
        inline: true,
      },
    )
    .setImage(GLOBAL_BANNER)
    .setFooter({
      text: "Hoshiko System • Configuración Unificada",
      iconURL: interactionUser.displayAvatarURL(),
    });

  const mainMenu =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("setup_main_menu")
        .setPlaceholder("Selecciona una opción...")
        .addOptions([
          {
            label: "Ajustar Comportamiento/Filtro",
            value: "menu_behavior",
            emoji: "🧠",
            description: "Cambia entre Normal, Pesado o Agresivo.",
          },
          {
            label: "Cambiar Identidad (Roleplay)",
            value: "menu_identity",
            emoji: "🎭",
            description: "Neko, Maid, Gymbro, etc.",
          },
          {
            label: "Seguridad (Anti-Raid/Links)",
            value: "menu_security",
            emoji: "🛡️",
            description: "Activa o desactiva protecciones.",
          },
          {
            label: "Chat Espontáneo AQUÍ",
            value: "ai_toggle_spontaneous",
            emoji: "🗣️",
            description: "Activa/Desactiva que hable sola en este canal.",
          },
        ]),
    );

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("setup_home")
      .setLabel("Inicio")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!specificMenu),
    new ButtonBuilder()
      .setCustomId("setup_refresh")
      .setLabel("Refrescar")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("setup_close")
      .setLabel("Salir")
      .setEmoji("✖️")
      .setStyle(ButtonStyle.Danger),
  );

  return {
    embeds: [embed],
    components: (specificMenu
      ? [specificMenu, buttons]
      : [mainMenu, buttons]) as any[],
  };
}

export const SetupMenus = {
  behavior: () =>
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("submenu_behavior_select")
        .setPlaceholder("🔥 Elige el nivel de intensidad...")
        .addOptions([
          {
            label: "😇 Normal (Robusto)",
            value: "normal",
            emoji: "🛡️",
            description: "Amigable. Filtro de seguridad MÁXIMO.",
          },
          {
            label: "😒 Pesado (Medio)",
            value: "pesado",
            emoji: "💢",
            description: "Sarcástica/Seca. Filtro MEDIO (Premium).",
          },
          {
            label: "😈 Agresivo (Sin Filtros)",
            value: "agresivo",
            emoji: "🔥",
            description: "Tóxica/Insultos. Filtro MÍNIMO (Premium).",
          },
        ]),
    ),
  security: () =>
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("submenu_security_select")
        .setPlaceholder("🛡️ Opciones de Protección")
        .addOptions([
          {
            label: "Alternar Anti-Raid",
            value: "toggle_antiRaid",
            emoji: "⚔️",
          },
          {
            label: "Alternar Anti-Links",
            value: "toggle_antiLinks",
            emoji: "🔗",
          },
          {
            label: "Alternar Snipe",
            value: "toggle_snipe",
            emoji: "🕵️",
            description:
              "Al activar, publica aviso de privacidad en canal público.",
          },
          {
            label: "Configurar Logs",
            value: "go_setup_logs",
            emoji: "📝",
            description: "Abre /setup-logs para gestionar canales de log.",
          },
        ]),
    ),
  identity: () =>
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("submenu_identity_select")
        .setPlaceholder("🎭 Elige el personaje...")
        .addOptions([
          { label: "Neko", value: "neko", emoji: "🐱" },
          { label: "Maid", value: "maid", emoji: "🧹" },
          { label: "Gymbro", value: "gymbro", emoji: "💪" },
          { label: "Yandere", value: "yandere", emoji: "🔪" },
          { label: "Assistant", value: "assistant", emoji: "👓" },
        ]),
    ),
};
