import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  Guild,
} from "discord.js";
import { IAConfigManager } from "../../../../Database/ai/IAConfigManager";
import { PremiumManager } from "../../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../../Database/guild/SettingsManager";
import type { SecurityLevel } from "../../../../Database/guild/serverConfig.model";
import {
  getServerStress,
  SECURITY_LEVEL_THRESHOLDS,
} from "../../../../Features/automod/automodState";
import { runSecurityDiagnostics } from "../../../../Features/automod/automodDiagnostics";

export type SetupView =
  | "main"
  | "behavior"
  | "identity"
  | "security"
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
    desc: "Cálida, curiosa, espontánea y cercana.",
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
  guild?: Guild | null,
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
    antiLinks: false,
    wordFilter: false,
    aiModeration: false,
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
      modules.antiSpam && "Spam",
      modules.antiLinks && "Links",
      modules.wordFilter && "Palabras",
      modules.aiModeration && "IA",
      modules.snipe && "Snipe",
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configuración del Núcleo")
      .setDescription(
        `Gestiona los módulos de seguridad, moderación y registros de Hoshiko.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
      )
      .setColor(baseColor)
      .setThumbnail(clientUser?.displayAvatarURL() || null)
      .addFields(
        {
          name: "✨ Identidad de Hoshiko",
          value: "**Estado:** 🌸 `Global Canónica`\n**Carácter:** Dulce, observadora y cercana\n**Personal Mode:** Preferencias por usuario",
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
        .setCustomId("nav_security")
        .setLabel("Seguridad")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("nav_logs_quick")
        .setLabel("Canal de Logs")
        .setEmoji("📋")
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

  // ─── 2. VISTA: COMPORTAMIENTO / IDENTIDAD CANÓNICA ──────────────────────
  if (view === "behavior" || view === "identity") {
    const embed = new EmbedBuilder()
      .setTitle("✨ Identidad Canónica y Personal Mode")
      .setDescription(
        `Hoshiko cuenta con una **identidad base global y coherente** en todos los servidores: dulce, observadora, cercana y con sutiles matices felinos.\n\n` +
        `Para garantizar la comodidad y privacidad de cada miembro, no existen personalidades divergentes por servidor. En su lugar, cada usuario dispone de su propio **Personal Mode**, donde puede configurar de forma individual y privada su estilo de respuesta (\`balanceado\`, \`conciso\`, \`detallado\`) y el uso de imágenes ilustrativas pidiéndoselo directamente a Hoshiko o mediante sus comandos personales ♡`,
      )
      .setColor(baseColor)
      .setFooter(footer);

    return { embeds: [embed], components: [buildBackRow("main")] };
  }

  // ─── 4. VISTA: SEGURIDAD ─────────────────────────────────────────────────
  if (view === "security") {
    const diag = guild
      ? runSecurityDiagnostics(guild, modules)
      : { healthy: true, issues: [], hierarchyIssue: false, botRolePosition: 0 };
    const warnNoLogs = !modlogChannel
      ? "\n\n⚠️ **Atención:** No tienes un canal de logs asignado. Pulsa **Canal de Logs** abajo para recibir alertas interactivas."
      : "";
    const warnNoSpam = !modules.antiSpam
      ? "\n\n⚠️ **Anti-Spam desactivado:** el servidor no tiene protección activa contra mensajes repetidos ni menciones masivas."
      : "";
    const warnDiag = !diag.healthy
      ? `\n\n⚠️ **Diagnóstico de Permisos:** Faltan permisos (${diag.issues.map((i) => i.permission.split(" ")[0]).join(", ")}).`
      : "";
    const warnHierarchy = diag.hierarchyIssue
      ? "\n⚠️ **Jerarquía de Roles:** El rol de Hoshiko está debajo de miembros a moderar."
      : "";

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Centro de Moderación y AutoMod")
      .setDescription(
        `**Perfil Activo:** ${secMeta.emoji} **${secMeta.label}** — *${secMeta.desc}*\n**Medidor de Estrés:** \`${stressScore} / ${stressThreshold} pts\` (-1 pt/seg)${warnNoSpam}${warnNoLogs}${warnDiag}${warnHierarchy}`,
      )
      .setColor(
        secLevel === 4
          ? 0xed4245
          : secLevel === 3
            ? 0xfaa61a
            : 0x57f287,
      )
      .addFields(
        {
          name: "🔗 Filtros de Chat y Contenido",
          value: `**Anti-Spam:** ${modules.antiSpam ? "🟢 ON" : "🔴 OFF"}\n**Anti-Links:** ${modules.antiLinks ? "🟢 ON" : "🔴 OFF"}\n**Filtro Palabras:** ${modules.wordFilter ? "🟢 ON" : "🔴 OFF"}\n**IA Moderación:** ${modules.aiModeration ? `🟢 ON (\`${modules.aiMode || "enforce"}\`)` : "🔴 OFF"}\n**Snipe:** ${modules.snipe ? "🟢 ON" : "🔴 OFF"}`,
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
        .setCustomId("sec_antiSpam")
        .setLabel(`Spam: ${modules.antiSpam ? "ON" : "OFF"}`)
        .setEmoji("🛡️")
        .setStyle(
          modules.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_antiLinks")
        .setLabel(`Links: ${modules.antiLinks ? "ON" : "OFF"}`)
        .setEmoji("🔗")
        .setStyle(
          modules.antiLinks ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_wordFilter")
        .setLabel(`Palabras: ${modules.wordFilter ? "ON" : "OFF"}`)
        .setEmoji("💬")
        .setStyle(
          modules.wordFilter ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_aiModeration")
        .setLabel(`IA: ${modules.aiModeration ? "ON" : "OFF"}`)
        .setEmoji("🤖")
        .setStyle(
          modules.aiModeration ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
      new ButtonBuilder()
        .setCustomId("sec_snipe")
        .setLabel(`Snipe: ${modules.snipe ? "ON" : "OFF"}`)
        .setEmoji("🕵️")
        .setStyle(
          modules.snipe ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
    );

    // Fila 3: Volver + Configurar Canal de Logs rápido + Aplicar Recomendado + Levantar Lockdown si aplica
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
      new ButtonBuilder()
        .setCustomId("act_apply_recommended")
        .setLabel("Recomendado (Nvl 2)")
        .setEmoji("✨")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("act_ai_recommend")
        .setLabel("Asistente IA")
        .setEmoji("🤖")
        .setStyle(ButtonStyle.Primary),
    );

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

  // Fallback a vista principal si no coincide
  return generateSetupUI(
    guildId,
    channelId,
    clientUser,
    interactionUser,
    "main",
    guild,
  );
}


