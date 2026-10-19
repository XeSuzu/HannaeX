import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { IAConfigManager } from "../../../../Database/ai/IAConfigManager";
import { PremiumManager } from "../../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../../Database/guild/SettingsManager";
import type { SecurityLevel } from "../../../../Database/guild/serverConfig.model";
import {
  getServerStress,
  SECURITY_LEVEL_THRESHOLDS,
} from "../../../../Features/automod/automodState";
import { isServerLockedDown } from "../../../../Features/automod/aiModeration";

export type SetupView =
  | "main"
  | "behavior"
  | "identity"
  | "security"
  | "snipe_confirm"
  | "logs_quick";

const SECURITY_LEVEL_META: Record<
  SecurityLevel,
  { label: string; emoji: string; desc: string }
> = {
  1: {
    label: "Nivel 1: Relajado",
    emoji: "🟢",
    desc: "Umbral 150 pts. Ideal para servidores pequeños o de amigos.",
  },
  2: {
    label: "Nivel 2: Estándar",
    emoji: "🔵",
    desc: "Umbral 100 pts. Protección equilibrada contra spam y alts.",
  },
  3: {
    label: "Nivel 3: Estricto",
    emoji: "🟠",
    desc: "Umbral 60 pts. Intervención rápida para comunidades grandes.",
  },
  4: {
    label: "Nivel 4: Lockdown",
    emoji: "🔴",
    desc: "Umbral 30 pts. Máxima alerta ante raids y ataques.",
  },
};

const BEHAVIOR_META: Record<
  string,
  { label: string; emoji: string; filter: string; desc: string; premium: boolean }
> = {
  normal: {
    label: "Normal",
    emoji: "😇",
    filter: "🛡️ Robusto (Family Friendly)",
    desc: "Amigable, cálida y respetuosa. Ideal para todo público.",
    premium: false,
  },
  pesado: {
    label: "Pesado",
    emoji: "😒",
    filter: "⚖️ Medio (Permite bromas)",
    desc: "Sarcástica, cortante y con humor ácido sin llegar a insultar.",
    premium: true,
  },
  agresivo: {
    label: "Agresivo",
    emoji: "😈",
    filter: "⚠️ Mínimo (Sin censura)",
    desc: "Tóxica, provocadora y sin filtros de lenguaje.",
    premium: true,
  },
};

const IDENTITY_META: Record<
  string,
  { label: string; emoji: string; desc: string; premium: boolean }
> = {
  neko: {
    label: "Neko",
    emoji: "🐱",
    desc: "Juguetona, curiosa y felina (nyaa~).",
    premium: false,
  },
  maid: {
    label: "Maid",
    emoji: "🧹",
    desc: "Servicial, educada y atenta con el servidor.",
    premium: false,
  },
  assistant: {
    label: "Assistant",
    emoji: "👓",
    desc: "Directa, formal y enfocada en resolver dudas.",
    premium: false,
  },
  gymbro: {
    label: "Gymbro",
    emoji: "💪",
    desc: "Motivador intenso obsesionado con el entrenamiento.",
    premium: true,
  },
  yandere: {
    label: "Yandere",
    emoji: "🔪",
    desc: "Celosa, posesiva y peligrosamente devota.",
    premium: true,
  },
};

function buildBackRow(targetView: SetupView = "main") {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_${targetView}`)
      .setLabel("<- Volver")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function generateSetupUI(
  guildId: string,
  channelId: string,
  clientUser: any,
  interactionUser: any,
  view: SetupView = "main",
) {
  const [set, aiSet, isPremium, stressScore] = await Promise.all([
    SettingsManager.getSettings(guildId),
    IAConfigManager.getConfig(guildId),
    PremiumManager.isPremium(guildId),
    getServerStress(guildId),
  ]);

  const modules = set?.securityModules || {
    securityLevel: 2,
    antiSpam: false,
    antiRaid: false,
    antiLinks: false,
    antiNuke: false,
    antiAlt: false,
    snipe: false,
  };
  const secLevel: SecurityLevel = (modules.securityLevel as SecurityLevel) || 2;
  const secMeta = SECURITY_LEVEL_META[secLevel] || SECURITY_LEVEL_META[2];
  const stressThreshold = SECURITY_LEVEL_THRESHOLDS[secLevel] ?? 100;

  const aiSys = aiSet.aiSystem || {
    mode: "neko",
    behavior: "normal",
    spontaneousChannels: [],
  };

  const currentBehavior = (aiSys.behavior || "normal").toLowerCase();
  const currentIdentity = (aiSys.mode || "neko").toLowerCase();
  const isSpontaneousHere = (aiSys.spontaneousChannels || []).includes(
    channelId,
  );
  const modlogChannel =
    set?.logChannels?.modlog ??
    set?.logChannels?.all ??
    set?.modLogChannel ??
    null;
  const logsDisplay = modlogChannel
    ? `<#${modlogChannel}>`
    : "⚠️ Sin configurar";

  const behInfo = BEHAVIOR_META[currentBehavior] || BEHAVIOR_META.normal;
  const idInfo = IDENTITY_META[currentIdentity] || IDENTITY_META.neko;

  const baseColor =
    currentBehavior === "agresivo"
      ? 0xed4245
      : currentBehavior === "pesado"
        ? 0xfaa61a
        : 0xffb7c5;

  const footer = {
    text: "Hoshiko System • Configuración del Núcleo",
    iconURL: interactionUser.displayAvatarURL(),
  };

  // ─── 1. PANEL PRINCIPAL (NÚCLEO) ─────────────────────────────────────────
  if (view === "main") {
    const activeProtections = [
      modules.antiRaid && "Raid",
      modules.antiLinks && "Links",
      modules.antiNuke && "Nuke",
      modules.antiAlt && "Alt",
      modules.snipe && "Snipe",
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configuración del Núcleo")
      .setDescription(
        `Gestiona el comportamiento, identidad y seguridad de Hoshiko.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
      )
      .setColor(baseColor)
      .setThumbnail(clientUser?.displayAvatarURL() || null)
      .addFields(
        {
          name: "🧠 Comportamiento",
          value: `**Modo:** ${behInfo.emoji} \`${behInfo.label}\`\n**Rol:** ${idInfo.emoji} \`${idInfo.label}\`\n**Filtro:** ${behInfo.filter}`,
          inline: true,
        },
        {
          name: "🛡️ Seguridad",
          value: `**Perfil:** ${secMeta.emoji} \`Nvl ${secLevel}\`\n**Estrés:** \`${stressScore}/${stressThreshold} pts\`\n**Módulos:** ${activeProtections.length > 0 ? `\`${activeProtections.join(", ")}\`` : "`Ninguno`"}\n**Logs:** ${logsDisplay}`,
          inline: true,
        },
        {
          name: "🗣️ Chat Espontáneo",
          value: "⚠️ **En mantenimiento**\n`Desactivado temporalmente`",
          inline: true,
        },
      )
      .setFooter(footer);

    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("nav_behavior")
        .setLabel("Comportamiento")
        .setEmoji("🧠")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("nav_identity")
        .setLabel("Identidad")
        .setEmoji("🎭")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("nav_security")
        .setLabel("Seguridad")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("act_spontaneous")
        .setLabel("Chat Espontáneo (Mantenimiento)")
        .setEmoji("⚠️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    const sysRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("nav_main")
        .setLabel("Refrescar")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("setup_close")
        .setLabel("Salir")
        .setEmoji("✖️")
        .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [navRow, sysRow] };
  }

  // ─── 2. VISTA: COMPORTAMIENTO ────────────────────────────────────────────
  if (view === "behavior") {
    const alternatives = Object.entries(BEHAVIOR_META)
      .map(([key, meta]) => {
        const isCurrent = key === currentBehavior;
        const lock = meta.premium && !isPremium ? " 🔒 *(Premium)*" : "";
        const indicator = isCurrent ? "👉 " : "• ";
        return `${indicator}${meta.emoji} **${meta.label}**${lock}\n  └ *${meta.desc}* (${meta.filter})`;
      })
      .join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle("🧠 Nivel de Comportamiento")
      .setDescription(
        `El comportamiento ajusta tanto el tono de respuesta como el nivel del filtro de seguridad.\n\n**Configuración Actual:** ${behInfo.emoji} \`${behInfo.label}\` — ${behInfo.filter}\n\n**Opciones Disponibles:**\n${alternatives}`,
      )
      .setColor(baseColor)
      .setFooter(footer);

    const optionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      Object.entries(BEHAVIOR_META).map(([key, meta]) => {
        const isCurrent = key === currentBehavior;
        const locked = meta.premium && !isPremium;
        return new ButtonBuilder()
          .setCustomId(`beh_${key}`)
          .setLabel(meta.label)
          .setEmoji(locked ? "🔒" : meta.emoji)
          .setStyle(
            isCurrent
              ? ButtonStyle.Success
              : locked
                ? ButtonStyle.Secondary
                : ButtonStyle.Primary,
          )
          .setDisabled(isCurrent);
      }),
    );

    return { embeds: [embed], components: [optionRow, buildBackRow("main")] };
  }

  // ─── 3. VISTA: IDENTIDAD ─────────────────────────────────────────────────
  if (view === "identity") {
    const alternatives = Object.entries(IDENTITY_META)
      .map(([key, meta]) => {
        const isCurrent = key === currentIdentity;
        const lock = meta.premium && !isPremium ? " 🔒 *(Premium)*" : "";
        const indicator = isCurrent ? "👉 " : "• ";
        return `${indicator}${meta.emoji} **${meta.label}**${lock} — ${meta.desc}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎭 Identidad (Roleplay)")
      .setDescription(
        `Elige la personalidad base con la que Hoshiko interactúa en el servidor.\n\n**Identidad Actual:** ${idInfo.emoji} \`${idInfo.label}\`\n\n**Perfiles Disponibles:**\n${alternatives}`,
      )
      .setColor(baseColor)
      .setFooter(footer);

    const optionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      Object.entries(IDENTITY_META).map(([key, meta]) => {
        const isCurrent = key === currentIdentity;
        const locked = meta.premium && !isPremium;
        return new ButtonBuilder()
          .setCustomId(`id_${key}`)
          .setLabel(meta.label)
          .setEmoji(locked ? "🔒" : meta.emoji)
          .setStyle(
            isCurrent
              ? ButtonStyle.Success
              : locked
                ? ButtonStyle.Secondary
                : ButtonStyle.Primary,
          )
          .setDisabled(isCurrent);
      }),
    );

    return { embeds: [embed], components: [optionRow, buildBackRow("main")] };
  }

  // ─── 4. VISTA: SEGURIDAD ─────────────────────────────────────────────────
  if (view === "security") {
    const lockedDown = await isServerLockedDown(guildId);
    const warnNoLogs = !modlogChannel
      ? "\n\n⚠️ **Atención:** No tienes un canal de logs asignado. Pulsa **Canal de Logs** abajo para recibir alertas interactivas."
      : "";
    const warnLockdown = lockedDown
      ? "\n\n🚨 **PROTOCOLO TORNIQUETE ACTIVO:** Los canales públicos están bloqueados temporalmente."
      : "";

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Centro de Seguridad y Perfiles")
      .setDescription(
        `**Perfil Activo:** ${secMeta.emoji} **${secMeta.label}** — *${secMeta.desc}*\n**Medidor de Estrés:** \`${stressScore} / ${stressThreshold} pts\` (-1 pt/seg)${warnLockdown}${warnNoLogs}`,
      )
      .setColor(
        lockedDown || secLevel === 4
          ? 0xed4245
          : secLevel === 3
            ? 0xfaa61a
            : 0x57f287,
      )
      .addFields(
        {
          name: "⚔️ Protecciones de Red",
          value: `**Anti-Raid:** ${modules.antiRaid ? "🟢 ON" : "🔴 OFF"}\n**Anti-Nuke:** ${modules.antiNuke ? "🟢 ON" : "🔴 OFF"}\n**Anti-Alt:** ${modules.antiAlt ? "🟢 ON" : "🔴 OFF"}`,
          inline: true,
        },
        {
          name: "🔗 Filtros de Chat",
          value: `**Anti-Links/Phish:** ${modules.antiLinks ? "🟢 ON" : "🔴 OFF"}\n**Snipe:** ${modules.snipe ? "🟢 ON" : "🔴 OFF"}`,
          inline: true,
        },
        {
          name: "📝 Canal de Alertas",
          value: `${logsDisplay}\n*(Usa \`/setup-logs\` para avanzado)*`,
          inline: true,
        },
      )
      .setFooter(footer);

    // Fila 1: Los 4 Perfiles Dinámicos de Seguridad (Pilar 4)
    const levelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ([1, 2, 3, 4] as SecurityLevel[]).map((lvl) => {
        const meta = SECURITY_LEVEL_META[lvl];
        const isCurrent = lvl === secLevel;
        return new ButtonBuilder()
          .setCustomId(`seclvl_${lvl}`)
          .setLabel(`Nvl ${lvl}`)
          .setEmoji(meta.emoji)
          .setStyle(isCurrent ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(isCurrent);
      }),
    );

    // Fila 2: Interruptores de Módulos (5 botones)
    const toggleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("sec_antiRaid")
        .setLabel(`Raid: ${modules.antiRaid ? "ON" : "OFF"}`)
        .setEmoji("⚔️")
        .setStyle(
          modules.antiRaid ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_antiLinks")
        .setLabel(`Links: ${modules.antiLinks ? "ON" : "OFF"}`)
        .setEmoji("🔗")
        .setStyle(
          modules.antiLinks ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_antiNuke")
        .setLabel(`Nuke: ${modules.antiNuke ? "ON" : "OFF"}`)
        .setEmoji("💣")
        .setStyle(
          modules.antiNuke ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_antiAlt")
        .setLabel(`Anti-Alt: ${modules.antiAlt ? "ON" : "OFF"}`)
        .setEmoji("🕵️")
        .setStyle(
          modules.antiAlt ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_snipe")
        .setLabel(`Snipe: ${modules.snipe ? "ON" : "OFF"}`)
        .setEmoji("🗑️")
        .setStyle(modules.snipe ? ButtonStyle.Success : ButtonStyle.Secondary),
    );

    // Fila 3: Volver + Configurar Canal de Logs rápido + Levantar Lockdown si aplica
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("nav_main")
        .setLabel("<- Volver")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("nav_logs_quick")
        .setLabel("Canal de Logs")
        .setEmoji("📝")
        .setStyle(ButtonStyle.Primary),
    );

    if (lockedDown) {
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId("act_unlockdown")
          .setLabel("Levantar Lockdown")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success),
      );
    }

    return { embeds: [embed], components: [levelRow, toggleRow, navRow] };
  }

  // ─── 5. VISTA ANIDADA: SELECTOR RÁPIDO DE CANAL DE LOGS ──────────────────
  if (view === "logs_quick") {
    const embed = new EmbedBuilder()
      .setTitle("📝 Asignar Canal de Logs (Moderación)")
      .setDescription(
        `Selecciona el canal donde Hoshiko enviará las alertas interactivas de seguridad y moderación.\n\n**Canal Actual:** ${logsDisplay}\n\n*(Para configurar canales separados de voz, mensajes, niveles o confesiones, usa \`/setup-logs\`).*`,
      )
      .setColor(0x5865f2)
      .setFooter(footer);

    const channelRow =
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId("quick_modlog_select")
          .setPlaceholder("Selecciona el canal para #mod-logs...")
          .setChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          ),
      );

    return {
      embeds: [embed],
      components: [channelRow, buildBackRow("security")],
    };
  }

  // ─── 6. VISTA ANIDADA: CONFIRMACIÓN DE SNIPE ─────────────────────────────
  const embed = new EmbedBuilder()
    .setTitle("🕵️ Activar Módulo Snipe")
    .setDescription(
      "Para cumplir con los Términos de Servicio de Discord, antes de activar **Snipe** es necesario publicar un **aviso de privacidad** en un canal de texto público (visible para `@everyone`).\n\nSelecciona el canal público en el menú inferior para publicar el aviso y activar la función.",
    )
    .setColor(0xfee75c)
    .setFooter(footer);

  const channelRow =
    new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("snipe_channel_select")
        .setPlaceholder("Selecciona un canal público para el aviso...")
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
        ),
    );

  return {
    embeds: [embed],
    components: [channelRow, buildBackRow("security")],
  };
}


