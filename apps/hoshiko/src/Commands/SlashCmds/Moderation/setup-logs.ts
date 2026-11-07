import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CategoryChannel,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildChannel,
  MessageFlags,
  OverwriteResolvable,
  OverwriteType,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js";
import { PremiumManager } from "../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { SlashCommand } from "../../../Interfaces/Command";

export const LOGS_CATEGORY_NAME = "🔒 HOSHIKO LOGS";

export const CORE_LOG_CHANNELS = [
  {
    key: "modlog",
    name: "mod-log",
    label: "#mod-log",
    emoji: "⚖️",
    description: "Moderación manual y automática (ban, kick, mute, warn, purge, casos)",
  },
  {
    key: "messagelog",
    name: "message-log",
    label: "#message-log",
    emoji: "✏️",
    description: "Mensajes editados y eliminados (ANTES / DESPUÉS y CONTENIDO)",
  },
  {
    key: "messagereview",
    name: "message-review",
    label: "#message-review",
    emoji: "🔎",
    description: "Mensajes enviados a revisión para validación de moderadores",
  },
  {
    key: "linkslog",
    name: "links-logs",
    label: "#links-logs",
    emoji: "🔗",
    description: "Enlaces detectados y neutralizados por la protección de enlaces",
  },
  {
    key: "voicelog",
    name: "voice-log",
    label: "#voice-log",
    emoji: "🎙️",
    description: "Actividad de voz (entradas, salidas, cambios, mute, deafen, cámara, stream)",
  },
  {
    key: "serverlog",
    name: "server-logs",
    label: "#server-logs",
    emoji: "📋",
    description: "Cambios de canales, permisos, roles y configuración del servidor",
  },
] as const;

export type CoreLogKey = (typeof CORE_LOG_CHANNELS)[number]["key"];

const EXTRA_LOGS = ["all", "joinlog", "confesslog", "boostlog", "levellog"];
const PREMIUM_EXTRA_LOGS = ["boostlog", "levellog"];

const LOG_META: Record<
  string,
  { label: string; emoji: string; description: string }
> = {
  modlog: {
    label: "Moderación (#mod-log)",
    emoji: "⚖️",
    description: "Ban, kick, mute, warn, purge y casos disciplinarios",
  },
  messagelog: {
    label: "Mensajes (#message-log)",
    emoji: "✏️",
    description: "Mensajes editados y eliminados en un único canal claro",
  },
  messagereview: {
    label: "Revisión (#message-review)",
    emoji: "🔎",
    description: "Mensajes marcados para revisión humana e IA moderación",
  },
  linkslog: {
    label: "Enlaces (#links-logs)",
    emoji: "🔗",
    description: "Enlaces detectados por la protección de enlaces (neutralizados)",
  },
  voicelog: {
    label: "Voz (#voice-log)",
    emoji: "🎙️",
    description: "Entradas, salidas, cambios, mute/deafen, cámara y stream",
  },
  serverlog: {
    label: "Servidor (#server-logs)",
    emoji: "📋",
    description: "Cambios de roles, canales, permisos y servidor con auditoría",
  },
  all: {
    label: "General (Fallback)",
    emoji: "📚",
    description: "Canal general de respaldo para logs no asignados",
  },
  joinlog: {
    label: "Entradas / Salidas",
    emoji: "🚪",
    description: "Nuevos miembros y salidas del servidor",
  },
  confesslog: {
    label: "Confesiones",
    emoji: "🔒",
    description: "Auditoría privada de confesiones y reportes",
  },
  boostlog: {
    label: "Boosts [PREMIUM]",
    emoji: "💎",
    description: "Nuevos boosts y cambios de nivel del servidor",
  },
  levellog: {
    label: "Niveles [PREMIUM]",
    emoji: "⭐",
    description: "Registro de subidas de nivel",
  },
};

export function checkRequiredBotLogPermissions(guild: Guild): {
  ok: boolean;
  missing: string[];
  canManageRoles: boolean;
} {
  const me = guild.members.me;
  if (!me) {
    return {
      ok: false,
      missing: ["Miembro del bot no disponible en caché"],
      canManageRoles: false,
    };
  }

  const required: Array<[bigint, string]> = [
    [PermissionFlagsBits.ManageChannels, "ManageChannels (Gestionar canales)"],
    [PermissionFlagsBits.ViewChannel, "ViewChannel (Ver canales)"],
    [PermissionFlagsBits.SendMessages, "SendMessages (Enviar mensajes)"],
    [PermissionFlagsBits.EmbedLinks, "EmbedLinks (Insertar enlaces)"],
    [
      PermissionFlagsBits.ReadMessageHistory,
      "ReadMessageHistory (Leer el historial de mensajes)",
    ],
  ];

  const missing: string[] = [];
  for (const [bit, label] of required) {
    if (!me.permissions.has(bit)) {
      missing.push(label);
    }
  }

  const canManageRoles =
    me.permissions.has(PermissionFlagsBits.ManageRoles) ||
    me.permissions.has(PermissionFlagsBits.Administrator);

  return {
    ok: missing.length === 0,
    missing,
    canManageRoles,
  };
}

export function buildChannelOverwrites(
  guild: Guild,
  allowedRoleIds: string[],
): OverwriteResolvable[] {
  const botId = guild.members.me?.id ?? guild.client.user?.id;
  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.id, // @everyone
      type: OverwriteType.Role,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
      ],
    },
  ];

  if (botId) {
    overwrites.push({
      id: botId,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  const validRoles = new Set<string>();
  for (const roleId of allowedRoleIds) {
    if (roleId && roleId !== guild.id && guild.roles.cache.has(roleId)) {
      validRoles.add(roleId);
    }
  }

  for (const roleId of validRoles) {
    overwrites.push({
      id: roleId,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
      deny: [PermissionFlagsBits.SendMessages],
    });
  }

  return overwrites;
}

export function hasManualPermissionChanges(
  channel: GuildChannel,
  expectedRoleIds: string[],
): boolean {
  const cache = channel.permissionOverwrites?.cache;
  if (!cache) return false;

  const everyoneOw = cache.get(channel.guild.id);
  if (!everyoneOw || !everyoneOw.deny.has(PermissionFlagsBits.ViewChannel)) {
    return true;
  }

  const expectedSet = new Set(expectedRoleIds.filter((id) => id !== channel.guild.id));
  const actualRoleIds = Array.from(cache.values())
    .filter(
      (ow) =>
        ow.type === OverwriteType.Role &&
        ow.id !== channel.guild.id &&
        ow.allow.has(PermissionFlagsBits.ViewChannel),
    )
    .map((ow) => ow.id);

  if (actualRoleIds.length !== expectedSet.size) return true;
  return actualRoleIds.some((id) => !expectedSet.has(id));
}

type SetupView =
  | "welcome"
  | "perm_mode"
  | "custom_perms"
  | "confirm"
  | "manual"
  | "manual_channel";

const command: SlashCommand = {
  category: "Moderation",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription(
      "📋 Asistente guiado para configurar y gestionar los canales de Hoshiko Logs.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const guild = interaction.guild;
    const guildId = guild.id;

    const initialSettings = await SettingsManager.getSettings(guildId);
    const savedSetup = (initialSettings as any)?.logsSetup || {};

    let currentView: SetupView = "welcome";
    let permissionMode: "default" | "custom" =
      savedSetup.permissionMode === "custom" ? "custom" : "default";
    let channelRoles: Record<string, string[]> = {
      modlog: Array.isArray(savedSetup.channelRoles?.modlog)
        ? [...savedSetup.channelRoles.modlog]
        : [],
      messagelog: Array.isArray(savedSetup.channelRoles?.messagelog)
        ? [...savedSetup.channelRoles.messagelog]
        : [],
      messagereview: Array.isArray(savedSetup.channelRoles?.messagereview)
        ? [...savedSetup.channelRoles.messagereview]
        : [],
      linkslog: Array.isArray(savedSetup.channelRoles?.linkslog)
        ? [...savedSetup.channelRoles.linkslog]
        : [],
      voicelog: Array.isArray(savedSetup.channelRoles?.voicelog)
        ? [...savedSetup.channelRoles.voicelog]
        : [],
      serverlog: Array.isArray(savedSetup.channelRoles?.serverlog)
        ? [...savedSetup.channelRoles.serverlog]
        : [],
    };
    let activePermChannelKey: CoreLogKey = "modlog";
    let postSetupPermEditOnly = false;
    let preserveManualOverwrites = false;
    let selectedManualLogKey: string | null = null;

    const generateUI = async () => {
      const [settings, isPremium] = await Promise.all([
        SettingsManager.getSettings(guildId),
        PremiumManager.isPremium(guildId),
      ]);

      const logChannels = (settings as any)?.logChannels || {};
      const logsSetup = (settings as any)?.logsSetup || {};

      // ─── 1. VISTA INICIAL (BIENVENIDA Y ESTADO GENERAL) ──────────────────
      if (currentView === "welcome") {
        const statusLines = CORE_LOG_CHANNELS.map((c) => {
          const chId = logChannels[c.key];
          const chObj = chId ? guild.channels.cache.get(chId) : null;
          const status = chObj
            ? `✅ <#${chId}>`
            : chId
              ? `⚠️ Canal eliminado (\`${chId}\`)`
              : "⚪ *Sin configurar*";
          return `${c.emoji} **${c.label}** — ${status}\n┗ *${c.description}*`;
        }).join("\n\n");

        const existingCatId = logsSetup.categoryId;
        const existingCat =
          (existingCatId && guild.channels.cache.get(existingCatId)) ||
          guild.channels.cache.find(
            (ch) =>
              ch.type === ChannelType.GuildCategory &&
              ch.name.toLowerCase() === LOGS_CATEGORY_NAME.toLowerCase(),
          );

        const configuredCount = CORE_LOG_CHANNELS.filter((c) => {
          const id = logChannels[c.key];
          return id && guild.channels.cache.has(id);
        }).length;

        const embed = new EmbedBuilder()
          .setTitle("Configuración de Hoshiko Logs")
          .setColor(0x5865f2)
          .setDescription(
            `Hoshiko puede crear y organizar automáticamente una estructura privada de auditoría:\n\n` +
              `📁 **Categoría privada:** \`${LOGS_CATEGORY_NAME}\` ${existingCat ? `(Detectada: **${existingCat.name}**)` : "(Se creará automáticamente)"}\n` +
              `📊 **Estado actual:** \`${configuredCount}/6\` canales principales activos\n` +
              `🔐 **Modo de permisos guardado:** \`${logsSetup.permissionMode === "custom" ? "Personalizado por rol" : "Predeterminado (Solo Administrador)"}\`\n\n` +
              statusLines,
          )
          .setFooter({
            text: "Hoshiko Logs • Usa el asistente guiado o gestiona permisos sin recrear canales",
          })
          .setTimestamp();

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_wizard_start")
            .setLabel(
              configuredCount === 6
                ? "Reparar / Reconfigurar Logs"
                : "Iniciar Asistente Guiado",
            )
            .setEmoji("🛠️")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("logs_manage_perms")
            .setLabel("Permisos por canal")
            .setEmoji("🔐")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("logs_manual_view")
            .setLabel("Selector manual")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("logs_close")
            .setLabel("Salir")
            .setEmoji("✖️")
            .setStyle(ButtonStyle.Danger),
        );

        return { embeds: [embed], components: [row1] };
      }

      // ─── 2. PASO OBLIGATORIO: ELECCIÓN DE MODO DE PERMISOS (§6) ──────────
      if (currentView === "perm_mode") {
        const embed = new EmbedBuilder()
          .setTitle("🔐 Selección de Permisos de Hoshiko Logs")
          .setColor(0xfaa61a)
          .setDescription(
            `> ⚠️ **Antes de continuar**\n` +
              `> Si eliges la configuración predeterminada, solo los usuarios con permiso de **Administrador** podrán ver los canales de logs.\n` +
              `> Si tu servidor utiliza roles de moderación sin permiso de Administrador, elige **Configuración personalizada** para asignar qué roles podrán ver cada canal.\n\n` +
              `**A. Configuración predeterminada**\n` +
              `• \`@everyone\` no puede ver los canales (\`ViewChannel\` denegado).\n` +
              `• Solo **Hoshiko** y usuarios con permiso **Administrator** tienen acceso.\n` +
              `• Hoshiko **nunca** adivina permisos por nombres de rol.\n\n` +
              `**B. Configuración personalizada**\n` +
              `• Selecciona explícitamente qué roles del servidor podrán ver cada uno de los 6 canales de logs en modo lectura.`,
          )
          .setFooter({
            text: "Paso 1 de 3 • Elige cómo proteger el acceso a los registros del servidor",
          });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_mode_default")
            .setLabel("Configuración predeterminada")
            .setEmoji("🛡️")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("logs_mode_custom")
            .setLabel("Configuración personalizada")
            .setEmoji("👥")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("logs_welcome")
            .setLabel("Volver")
            .setStyle(ButtonStyle.Secondary),
        );

        return { embeds: [embed], components: [row] };
      }

      // ─── 3. CONFIGURACIÓN PERSONALIZADA DE ROLES POR CANAL (§6.4 y §7) ───
      if (currentView === "custom_perms") {
        const activeMeta =
          CORE_LOG_CHANNELS.find((c) => c.key === activePermChannelKey) ??
          CORE_LOG_CHANNELS[0];

        const summaryLines = CORE_LOG_CHANNELS.map((c) => {
          const roles = channelRoles[c.key] || [];
          const rolesDisplay =
            roles.length > 0
              ? roles.map((rId) => `<@&${rId}>`).join(", ")
              : "*Solo Administrador*";
          const marker = c.key === activePermChannelKey ? "👉 " : "";
          return `${marker}${c.emoji} **${c.label}:** ${rolesDisplay}`;
        }).join("\n");

        const embed = new EmbedBuilder()
          .setTitle(
            postSetupPermEditOnly
              ? "🔐 Gestionar Permisos de Canales de Logs"
              : "👥 Configuración Personalizada de Permisos por Canal",
          )
          .setColor(0x5865f2)
          .setDescription(
            `Configura qué roles tienen permiso de lectura (\`ViewChannel\` + \`ReadMessageHistory\`) en cada canal.\n` +
              `Los miembros no podrán escribir en los canales de logs para mantener el registro limpio.\n\n` +
              `**Canal seleccionado actualmente:** ${activeMeta.emoji} **${activeMeta.label}**\n\n` +
              `**Resumen de acceso por canal:**\n${summaryLines}`,
          )
          .setFooter({
            text: postSetupPermEditOnly
              ? "Los cambios se aplicarán directamente sobre los canales existentes sin recrearlos"
              : "Paso 2 de 3 • Selecciona un canal y asigna los roles autorizados",
          });

        const channelMenu =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("logs_perm_channel_select")
              .setPlaceholder("Elige el canal de log para editar sus roles...")
              .addOptions(
                CORE_LOG_CHANNELS.map((c) => ({
                  label: `${c.label} — ${c.description.slice(0, 50)}`,
                  value: c.key,
                  emoji: c.emoji,
                  default: c.key === activePermChannelKey,
                })),
              ),
          );

        const roleMenu =
          new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId(`logs_perm_roles_${activePermChannelKey}`)
              .setPlaceholder(
                `Selecciona los roles con acceso a ${activeMeta.label}...`,
              )
              .setMinValues(0)
              .setMaxValues(10),
          );

        const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_perm_copy_all")
            .setLabel("Aplicar estos roles a los 6 canales")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("logs_perm_clear_current")
            .setLabel("Solo Admin en este canal")
            .setEmoji("🧹")
            .setStyle(ButtonStyle.Secondary),
        );

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          postSetupPermEditOnly
            ? new ButtonBuilder()
                .setCustomId("logs_apply_perms_only")
                .setLabel("Guardar y actualizar permisos")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
            : new ButtonBuilder()
                .setCustomId("logs_to_confirm")
                .setLabel("Continuar al resumen")
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(postSetupPermEditOnly ? "logs_welcome" : "logs_wizard_start")
            .setLabel("Volver")
            .setStyle(ButtonStyle.Secondary),
        );

        return {
          embeds: [embed],
          components: [channelMenu, roleMenu, navRow, actionRow],
        };
      }

      // ─── 4. RESUMEN PREVIO A LA CONFIRMACIÓN (§6.5) ──────────────────────
      if (currentView === "confirm") {
        const existingCat =
          (logsSetup.categoryId &&
            guild.channels.cache.get(logsSetup.categoryId)) ||
          guild.channels.cache.find(
            (ch) =>
              ch.type === ChannelType.GuildCategory &&
              ch.name.toLowerCase() === LOGS_CATEGORY_NAME.toLowerCase(),
          );

        let manualChangeDetected = false;
        const planLines = CORE_LOG_CHANNELS.map((c) => {
          const savedId = logChannels[c.key];
          const existingCh =
            (savedId && guild.channels.cache.get(savedId)) ||
            (existingCat
              ? guild.channels.cache.find(
                  (ch) =>
                    ch.parentId === existingCat.id &&
                    ch.name.toLowerCase() === c.name.toLowerCase(),
                )
              : null);

          const expectedRoles =
            permissionMode === "custom" ? channelRoles[c.key] || [] : [];
          if (
            existingCh &&
            hasManualPermissionChanges(
              existingCh as GuildChannel,
              expectedRoles,
            )
          ) {
            manualChangeDetected = true;
          }

          const actionTag = existingCh
            ? `♻️ Reutilizar <#${existingCh.id}>`
            : `✨ Crear \`${c.label}\``;
          const rolesText =
            permissionMode === "default" || expectedRoles.length === 0
              ? "Solo `Administrator`"
              : expectedRoles.map((r) => `<@&${r}>`).join(", ");

          return `${c.emoji} **${c.label}** ➔ ${actionTag}\n┗ **Acceso:** ${rolesText}`;
        }).join("\n\n");

        const permCheck = checkRequiredBotLogPermissions(guild);
        const warnings: string[] = [];
        if (!permCheck.ok) {
          warnings.push(
            `❌ **Permisos faltantes en Hoshiko:** ${permCheck.missing.join(", ")}`,
          );
        }
        if (!permCheck.canManageRoles) {
          warnings.push(
            `⚠️ Hoshiko no tiene **ManageRoles (Gestionar roles/permisos)**; puede que no logre aplicar overwrites personalizados.`,
          );
        }
        if (manualChangeDetected) {
          warnings.push(
            `ℹ️ Se detectaron cambios manuales de permisos en canales existentes. Modo actual al confirmar: **${preserveManualOverwrites ? "Conservar permisos actuales" : "Aplicar permisos configurados en Hoshiko"}**.`,
          );
        }

        const embed = new EmbedBuilder()
          .setTitle("📋 Resumen Previo a la Confirmación")
          .setColor(permCheck.ok ? 0x57f287 : 0xed4245)
          .setDescription(
            `Revisa la configuración antes de crear o actualizar la estructura en Discord:\n\n` +
              `📁 **Categoría:** \`${LOGS_CATEGORY_NAME}\` (${existingCat ? "Se reutilizará la existente" : "Se creará privada"})\n` +
              `🔐 **Modo de permisos:** **${permissionMode === "default" ? "Predeterminada (Solo Administrador)" : "Personalizada por rol"}**\n` +
              `🚫 **@everyone:** \`ViewChannel\` denegado en toda la categoría\n\n` +
              `${planLines}` +
              (warnings.length > 0 ? `\n\n${warnings.join("\n")}` : ""),
          )
          .setFooter({
            text: "Paso 3 de 3 • Confirma para aplicar los cambios de forma idempotente",
          });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_confirm_apply")
            .setLabel("Confirmar configuración")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
            .setDisabled(!permCheck.ok),
          new ButtonBuilder()
            .setCustomId("logs_wizard_start")
            .setLabel("Volver a permisos")
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("logs_welcome")
            .setLabel("Cancelar")
            .setEmoji("✖️")
            .setStyle(ButtonStyle.Danger),
        );

        const rows: ActionRowBuilder<ButtonBuilder>[] = [row];
        if (manualChangeDetected) {
          rows.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("logs_toggle_preserve_overwrites")
                .setLabel(
                  preserveManualOverwrites
                    ? "Modo: Conservar permisos manuales actuales"
                    : "Modo: Sobrescribir con permisos de Hoshiko",
                )
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Secondary),
            ),
          );
        }

        return { embeds: [embed], components: rows };
      }

      // ─── 5. SUBVISTA MANUAL: SELECCIONAR CANAL ESPECÍFICO ────────────────
      if (
        currentView === "manual_channel" &&
        selectedManualLogKey &&
        LOG_META[selectedManualLogKey]
      ) {
        const meta = LOG_META[selectedManualLogKey];
        const currentChannelId = logChannels[selectedManualLogKey];

        const embed = new EmbedBuilder()
          .setTitle(`${meta.emoji} Asignar Canal: ${meta.label}`)
          .setColor(0x5865f2)
          .setDescription(
            `${meta.description}\n\n**Estado actual:** ${currentChannelId ? `<#${currentChannelId}>` : "⚠️ Sin configurar"}\n\nSelecciona un canal de texto existente o desactívalo.`,
          )
          .setFooter({ text: "Hoshiko Logs • Selector Manual de Canales" });

        const channelRow =
          new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`logs_ch_select_${selectedManualLogKey}`)
              .setPlaceholder(`Elige el canal para ${meta.label}...`)
              .setChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
              ),
          );

        const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("logs_manual_view")
            .setLabel("<- Volver")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`logs_disable_${selectedManualLogKey}`)
            .setLabel("Desactivar este log")
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!currentChannelId),
        );

        return { embeds: [embed], components: [channelRow, navRow] };
      }

      // ─── 6. VISTA DE SELECTOR MANUAL DE CANALES ──────────────────────────
      const coreFields = CORE_LOG_CHANNELS.map((c) => {
        const channelId = logChannels[c.key];
        return `${c.emoji} **${c.label}:** ${channelId ? `<#${channelId}>` : "⚠️ *Sin configurar*"}`;
      }).join("\n");

      const extraFields = EXTRA_LOGS.map((key) => {
        const meta = LOG_META[key];
        const channelId = logChannels[key];
        const isPremOnly = PREMIUM_EXTRA_LOGS.includes(key);
        const status =
          isPremOnly && !isPremium
            ? "🔒 *Premium*"
            : channelId
              ? `<#${channelId}>`
              : "⚠️ *Sin configurar*";
        return `${meta.emoji} **${meta.label}:** ${status}`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📋 Asignación Manual de Canales de Logs")
        .setColor(isPremium ? 0xf1c40f : 0x5865f2)
        .setDescription(
          `Asigna manualmente cualquier canal existente a cada categoría de Hoshiko Logs.`,
        )
        .addFields(
          { name: "🔒 6 Canales Principales", value: coreFields, inline: true },
          { name: "➕ Canales Adicionales", value: extraFields, inline: true },
        )
        .setFooter({
          text: "Selecciona una categoría del menú desplegable para asignarle un canal",
        })
        .setTimestamp();

      const allKeys = [
        ...CORE_LOG_CHANNELS.map((c) => c.key),
        ...EXTRA_LOGS,
      ];
      const menuOptions = allKeys.map((key) => ({
        label: LOG_META[key].label,
        value: key,
        emoji: LOG_META[key].emoji,
        description:
          PREMIUM_EXTRA_LOGS.includes(key) && !isPremium
            ? "🔒 Requiere suscripción Premium"
            : LOG_META[key].description.slice(0, 100),
      }));

      const menu =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("logs_select")
            .setPlaceholder("Selecciona un tipo de log para configurar...")
            .addOptions(menuOptions),
        );

      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("logs_welcome")
          .setLabel("<- Volver al Asistente")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("logs_clear_all")
          .setLabel("Limpiar Todo")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("logs_close")
          .setLabel("Salir")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Secondary),
      );

      return { embeds: [embed], components: [menu, buttons] };
    };

    /**
     * Ejecuta la creación/reparación idempotente de la categoría 🔒 HOSHIKO LOGS y sus 6 canales,
     * o actualiza únicamente los overwrites si postSetupPermEditOnly === true.
     */
    const applyLogsConfiguration = async (onlyUpdatePermissions: boolean) => {
      const permCheck = checkRequiredBotLogPermissions(guild);
      if (!permCheck.ok) {
        return new EmbedBuilder()
          .setTitle("❌ Permisos insuficientes en Hoshiko")
          .setColor(0xed4245)
          .setDescription(
            `No pude completar la configuración porque me faltan los siguientes permisos en el servidor:\n\n` +
              permCheck.missing.map((m) => `• **${m}**`).join("\n"),
          );
      }

      const settings = await SettingsManager.getSettings(guildId);
      const currentChannels = { ...((settings as any)?.logChannels || {}) };
      const currentSetup = { ...((settings as any)?.logsSetup || {}) };
      const issues: string[] = [];
      const createdOrReused: string[] = [];

      // 1. Resolver o crear categoría privada 🔒 HOSHIKO LOGS
      let category: CategoryChannel | null = null;
      if (currentSetup.categoryId) {
        const cached = guild.channels.cache.get(currentSetup.categoryId);
        if (cached && cached.type === ChannelType.GuildCategory) {
          category = cached as CategoryChannel;
        }
      }
      if (!category) {
        const found = guild.channels.cache.find(
          (ch) =>
            ch.type === ChannelType.GuildCategory &&
            ch.name.toLowerCase() === LOGS_CATEGORY_NAME.toLowerCase(),
        );
        if (found) category = found as CategoryChannel;
      }

      const unionRoles =
        permissionMode === "custom"
          ? Array.from(
              new Set(
                Object.values(channelRoles)
                  .flat()
                  .filter(Boolean),
              ),
            )
          : [];

      if (!category && !onlyUpdatePermissions) {
        try {
          category = await guild.channels.create({
            name: LOGS_CATEGORY_NAME,
            type: ChannelType.GuildCategory,
            permissionOverwrites: buildChannelOverwrites(guild, unionRoles),
            reason: `Configuración guiada de Hoshiko Logs por ${interaction.user.tag}`,
          });
        } catch (err: any) {
          issues.push(
            `No se pudo crear la categoría \`${LOGS_CATEGORY_NAME}\`: ${err?.message || "Error de permisos"}`,
          );
        }
      } else if (category && (!preserveManualOverwrites || onlyUpdatePermissions)) {
        await category.permissionOverwrites
          .set(
            buildChannelOverwrites(guild, unionRoles),
            `Actualización de permisos Hoshiko Logs por ${interaction.user.tag}`,
          )
          .catch((err) => {
            issues.push(
              `No se pudieron actualizar los permisos de la categoría \`${category?.name}\`: ${err?.message || "Error"}`,
            );
          });
      }

      // 2. Resolver, crear o actualizar cada uno de los 6 canales núcleo
      for (const spec of CORE_LOG_CHANNELS) {
        const allowedRoles =
          permissionMode === "custom" ? channelRoles[spec.key] || [] : [];
        const overwrites = buildChannelOverwrites(guild, allowedRoles);

        let targetChannel: TextChannel | null = null;
        const savedId = currentChannels[spec.key];
        if (savedId) {
          const existing = guild.channels.cache.get(savedId);
          if (existing && existing.isTextBased()) {
            targetChannel = existing as TextChannel;
          }
        }

        if (!targetChannel && category) {
          const byNameInCat = guild.channels.cache.find(
            (ch) =>
              ch.parentId === category!.id &&
              ch.type === ChannelType.GuildText &&
              ch.name.toLowerCase() === spec.name.toLowerCase(),
          );
          if (byNameInCat) targetChannel = byNameInCat as TextChannel;
        }

        if (!targetChannel && !onlyUpdatePermissions) {
          try {
            targetChannel = await guild.channels.create({
              name: spec.name,
              type: ChannelType.GuildText,
              topic: `Hoshiko Logs • ${spec.description}`,
              parent: category?.id,
              permissionOverwrites: overwrites,
              reason: `Configuración guiada de Hoshiko Logs por ${interaction.user.tag}`,
            });
            currentChannels[spec.key] = targetChannel.id;
            createdOrReused.push(
              `✨ **${spec.label}** creado (<#${targetChannel.id}>)`,
            );
          } catch (err: any) {
            issues.push(
              `Fallo al crear \`${spec.label}\`: ${err?.message || "Error desconocido"}`,
            );
          }
        } else if (targetChannel) {
          currentChannels[spec.key] = targetChannel.id;
          const shouldSyncOverwrites =
            onlyUpdatePermissions || !preserveManualOverwrites;
          if (shouldSyncOverwrites) {
            try {
              await targetChannel.permissionOverwrites.set(
                overwrites,
                `Permisos actualizados desde /setup-logs por ${interaction.user.tag}`,
              );
              createdOrReused.push(
                `✅ **${spec.label}** sincronizado (<#${targetChannel.id}>)`,
              );
            } catch (err: any) {
              issues.push(
                `Fallo al actualizar permisos en <#${targetChannel.id}>: ${err?.message || "Error"}`,
              );
            }
          } else {
            createdOrReused.push(
              `♻️ **${spec.label}** reutilizado conservando permisos (<#${targetChannel.id}>)`,
            );
          }
        } else if (onlyUpdatePermissions) {
          issues.push(
            `El canal **${spec.label}** aún no existe. Usa el asistente guiado para crearlo.`,
          );
        }
      }

      const configuredCount = CORE_LOG_CHANNELS.filter(
        (c) =>
          currentChannels[c.key] &&
          guild.channels.cache.has(currentChannels[c.key]),
      ).length;

      const status: "configured" | "partial" | "unconfigured" =
        configuredCount === 6 && issues.length === 0
          ? "configured"
          : configuredCount > 0
            ? "partial"
            : "unconfigured";

      const updatePayload: Record<string, any> = {
        "logsSetup.categoryId": category?.id ?? currentSetup.categoryId ?? null,
        "logsSetup.permissionMode": permissionMode,
        "logsSetup.channelRoles": channelRoles,
        "logsSetup.status": status,
        "logsSetup.lastIssues": issues,
        "logsSetup.updatedAt": new Date(),
      };

      for (const spec of CORE_LOG_CHANNELS) {
        updatePayload[`logChannels.${spec.key}`] =
          currentChannels[spec.key] ?? null;
      }

      await SettingsManager.updateSettings(guildId, updatePayload as any);

      return new EmbedBuilder()
        .setTitle(
          issues.length === 0
            ? "✅ Hoshiko Logs configurado correctamente"
            : "⚠️ Hoshiko Logs aplicado con observaciones",
        )
        .setColor(issues.length === 0 ? 0x57f287 : 0xfaa61a)
        .setDescription(
          `📁 **Categoría:** ${category ? `**${category.name}**` : "`No disponible`"}\n` +
            `🔐 **Modo de permisos:** **${permissionMode === "default" ? "Predeterminada (Solo Administrador)" : "Personalizada por rol"}**\n\n` +
            `**Estado de canales:**\n${createdOrReused.join("\n") || "Sin canales procesados"}` +
            (issues.length > 0
              ? `\n\n**Incidencias detectadas:**\n${issues.map((x) => `• ${x}`).join("\n")}`
              : ""),
        )
        .setFooter({ text: "Hoshiko Logs • Configuración guardada" })
        .setTimestamp();
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
          | ChannelSelectMenuInteraction
          | RoleSelectMenuInteraction,
      ) => {
        try {
          await i.deferUpdate();
        } catch {
          return;
        }
        const isPremium = await PremiumManager.isPremium(guildId);

        // 1. Menú de selección manual de tipo de log
        if (i.isStringSelectMenu() && i.customId === "logs_select") {
          const logKey = i.values[0];
          if (PREMIUM_EXTRA_LOGS.includes(logKey) && !isPremium) {
            await i.followUp({
              content: "🔒 Esta categoría adicional requiere **Premium**.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          selectedManualLogKey = logKey;
          currentView = "manual_channel";
          await interaction.editReply(await generateUI());
          return;
        }

        // 2. Menú de selección de canal en vista de permisos personalizados
        if (
          i.isStringSelectMenu() &&
          i.customId === "logs_perm_channel_select"
        ) {
          activePermChannelKey = i.values[0] as CoreLogKey;
          await interaction.editReply(await generateUI());
          return;
        }

        // 3. Menú de selección de roles para el canal activo
        if (
          i.isRoleSelectMenu() &&
          i.customId.startsWith("logs_perm_roles_")
        ) {
          const key = i.customId.replace("logs_perm_roles_", "") as CoreLogKey;
          channelRoles[key] = i.values.filter((id) => id !== guildId);
          permissionMode = "custom";
          await interaction.editReply(await generateUI());
          return;
        }

        // 4. Selección de canal existente en subvista manual
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
          selectedManualLogKey = null;
          currentView = "manual";
          await interaction.editReply(await generateUI());
          return;
        }

        // 5. Botones de navegación y confirmación
        if (i.isButton()) {
          if (i.customId === "logs_close") {
            collector.stop();
            return;
          }

          if (i.customId === "logs_welcome") {
            currentView = "welcome";
            postSetupPermEditOnly = false;
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_wizard_start") {
            postSetupPermEditOnly = false;
            currentView = "perm_mode";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_manage_perms") {
            postSetupPermEditOnly = true;
            permissionMode = "custom";
            currentView = "custom_perms";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_mode_default") {
            permissionMode = "default";
            currentView = "confirm";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_mode_custom") {
            permissionMode = "custom";
            currentView = "custom_perms";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_perm_copy_all") {
            const currentRoles = [...(channelRoles[activePermChannelKey] || [])];
            for (const c of CORE_LOG_CHANNELS) {
              channelRoles[c.key] = [...currentRoles];
            }
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_perm_clear_current") {
            channelRoles[activePermChannelKey] = [];
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_to_confirm") {
            currentView = "confirm";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_toggle_preserve_overwrites") {
            preserveManualOverwrites = !preserveManualOverwrites;
            await interaction.editReply(await generateUI());
            return;
          }

          if (
            i.customId === "logs_confirm_apply" ||
            i.customId === "logs_apply_perms_only"
          ) {
            const onlyPerms = i.customId === "logs_apply_perms_only";
            const resultEmbed = await applyLogsConfiguration(onlyPerms);
            currentView = "welcome";
            postSetupPermEditOnly = false;
            const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("logs_welcome")
                .setLabel("Volver al panel de Hoshiko Logs")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Primary),
            );
            await interaction.editReply({
              embeds: [resultEmbed],
              components: [backRow],
            });
            return;
          }

          if (i.customId === "logs_manual_view" || i.customId === "logs_back") {
            selectedManualLogKey = null;
            currentView = "manual";
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
            selectedManualLogKey = null;
            currentView = "manual";
            await interaction.editReply(await generateUI());
            return;
          }

          if (i.customId === "logs_clear_all") {
            await SettingsManager.updateSettings(guildId, {
              "logChannels.all": null,
              "logChannels.modlog": null,
              "logChannels.messagelog": null,
              "logChannels.messagereview": null,
              "logChannels.linkslog": null,
              "logChannels.voicelog": null,
              "logChannels.serverlog": null,
              "logChannels.confesslog": null,
              "logChannels.joinlog": null,
              "logChannels.boostlog": null,
              "logChannels.levellog": null,
              "confessions.logsChannelId": null,
              "logsSetup.status": "unconfigured",
            } as any);
            await interaction.editReply(await generateUI());
            return;
          }
        }
      },
    );

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
