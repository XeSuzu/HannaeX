import {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  User,
  WebhookClient,
} from "discord.js";
import { PremiumManager } from "../../Database/guild/PremiumManager";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import {
  ILogChannels,
  IServerConfig,
} from "../../Database/guild/serverConfig.model";
import { LocalStorage } from "./LocalStorage";

export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  guildId?: string;
  userId?: string;
  metadata?: any;
}

export type LogType =
  | "BAN"
  | "TEMP_BAN"
  | "SOFTBAN"
  | "UNBAN"
  | "KICK"
  | "MUTE"
  | "TEMP_MUTE"
  | "UNMUTE"
  | "WARN"
  | "UNWARN"
  | "PURGE"
  | "AUTOMOD"
  | "LINKS"
  | "MESSAGE_REVIEW"
  | "CONFIG"
  | "SECURITY"
  | "ANTI_ALT"
  | "ANTI_NUKE"
  | "VERIFICATION";

const LOG_TYPE_CHANNEL: Record<LogType, keyof ILogChannels> = {
  BAN: "modlog",
  TEMP_BAN: "modlog",
  SOFTBAN: "modlog",
  UNBAN: "modlog",
  KICK: "modlog",
  MUTE: "modlog",
  TEMP_MUTE: "modlog",
  UNMUTE: "modlog",
  WARN: "modlog",
  UNWARN: "modlog",
  PURGE: "modlog",
  AUTOMOD: "modlog",
  LINKS: "linkslog",
  MESSAGE_REVIEW: "messagereview",
  CONFIG: "serverlog",
  SECURITY: "modlog",
  ANTI_ALT: "joinlog",
  ANTI_NUKE: "modlog",
  VERIFICATION: "joinlog",
};

/**
 * Los 6 canales núcleo de Hoshiko Logs (modlog, messagelog, messagereview,
 * linkslog, voicelog, serverlog) están disponibles en todos los servidores.
 * Solo boostlog y levellog permanecen como extras de nivel/boost.
 */
export const PREMIUM_LOG_CHANNELS = new Set<keyof ILogChannels>([
  "boostlog",
  "levellog",
]);

/**
 * Neutraliza un enlace para que no sea clicable ni genere vista previa en Discord.
 */
export function sanitizeUrlForLog(rawUrl: string): string {
  return String(rawUrl || "")
    .replace(/`/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/^https:\/\//i, "hxxps://")
    .replace(/^http:\/\//i, "hxxp://")
    .replace(/discord\.gg\//gi, "discord[.]gg/")
    .replace(/discord\.com\/invite\//gi, "discord[.]com/invite/")
    .replace(/discordapp\.com\/invite\//gi, "discordapp[.]com/invite/")
    .slice(0, 300);
}

/**
 * Resolución híbrida de canales de log:
 * 1. Canal específico (modlog, messagelog, messagereview, linkslog, voicelog, serverlog, etc.)
 * 2. Para messagereview y linkslog: fallback a modlog si aún no tienen canal propio configurado
 * 3. Fallback a campos deprecados (modLogChannel / confessions.logsChannelId)
 * 4. Fallback a "all" (salvo confesslog para proteger privacidad de confesiones)
 */
export function resolveLogChannel(
  settings: IServerConfig,
  channelType: keyof ILogChannels,
  guild?: Guild,
): string | null {
  const channels = settings.logChannels;

  if (channels?.[channelType]) return channels[channelType];

  if (channelType === "messagereview" || channelType === "linkslog") {
    if (channels?.modlog) return channels.modlog;
    if ((settings as any).modLogChannel) return (settings as any).modLogChannel;
  }

  // Fallback a campos antiguos antes del canal general "all"
  if (channelType === "modlog" && (settings as any).modLogChannel) {
    return (settings as any).modLogChannel;
  }
  if (
    channelType === "confesslog" &&
    settings.confessions?.logsChannelId
  ) {
    return settings.confessions.logsChannelId;
  }

  // Confesslog es privado: no cae al canal público "all" a menos que se configure explícitamente
  if (channelType !== "confesslog" && channels?.all) {
    return channels.all;
  }

  // Fallback inteligente: si no hay canal de logs configurado, buscar canal de moderación existente
  if (guild && (channelType === "messagereview" || channelType === "modlog")) {
    const candidate = guild.channels.cache.find(
      (c) =>
        c.isTextBased() &&
        guild.members.me?.permissionsIn(c as TextChannel).has(PermissionFlagsBits.SendMessages) &&
        /mod|review|staff|admin|audit/i.test(c.name),
    );
    if (candidate) return candidate.id;
  }

  return null;
}

interface QueuedBatch {
  channel: TextChannel;
  embeds: EmbedBuilder[];
  timer: NodeJS.Timeout;
}

export class HoshikoLogger {
  private static webhookClient: WebhookClient | null = null;
  private static batchQueues = new Map<string, QueuedBatch>();
  private static readonly BATCH_WINDOW_MS = 1200;
  private static readonly DEDUP_TTL_MS = 10_000;
  private static recentBotActions = new Map<string, number>();
  private static recentBotDeletedMessages = new Map<string, number>();

  static {
    if (process.env.LOGS_WEBHOOK_URL) {
      this.webhookClient = new WebhookClient({
        url: process.env.LOGS_WEBHOOK_URL,
      });
      console.log(
        "\x1b[32m[LOGGER]\x1b[0m Singleton Webhook enlazado y listo.",
      );
    }
  }

  private static readonly COLORS: Record<LogType, number> = {
    BAN: 0xed4245,
    TEMP_BAN: 0xed4245,
    SOFTBAN: 0xff6600,
    UNBAN: 0x57f287,
    KICK: 0xff5500,
    MUTE: 0xfaa61a,
    TEMP_MUTE: 0xfaa61a,
    UNMUTE: 0x57f287,
    WARN: 0xfee75c,
    UNWARN: 0x57f287,
    PURGE: 0x5865f2,
    AUTOMOD: 0xfaa61a,
    LINKS: 0xfaa61a,
    MESSAGE_REVIEW: 0xfee75c,
    CONFIG: 0x5865f2,
    SECURITY: 0x2b2d31,
    ANTI_ALT: 0xfaa61a,
    ANTI_NUKE: 0xed4245,
    VERIFICATION: 0x57f287,
  };

  private static pruneMap(map: Map<string, number>, now: number): void {
    if (map.size < 200) return;
    for (const [key, exp] of map.entries()) {
      if (exp <= now) map.delete(key);
    }
  }

  /**
   * Registra una acción disciplinaria iniciada por Hoshiko para evitar logs duplicados
   * cuando Discord emite guildBanAdd / guildMemberRemove.
   */
  static markBotModerationAction(
    guildId: string,
    action: "BAN" | "UNBAN" | "KICK",
    targetId: string,
  ): void {
    const now = Date.now();
    this.pruneMap(this.recentBotActions, now);
    this.recentBotActions.set(`${guildId}:${action}:${targetId}`, now + this.DEDUP_TTL_MS);
  }

  static wasRecentBotModerationAction(
    guildId: string,
    action: "BAN" | "UNBAN" | "KICK",
    targetId: string,
  ): boolean {
    const key = `${guildId}:${action}:${targetId}`;
    const exp = this.recentBotActions.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.recentBotActions.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Registra que un mensaje fue eliminado por AutoMod/moderación de Hoshiko
   * para evitar emitir un log redundante en #message-log.
   */
  static markBotMessageDelete(messageId: string): void {
    if (!messageId) return;
    const now = Date.now();
    this.pruneMap(this.recentBotDeletedMessages, now);
    this.recentBotDeletedMessages.set(messageId, now + this.DEDUP_TTL_MS);
  }

  static wasRecentBotMessageDelete(messageId: string): boolean {
    if (!messageId) return false;
    const exp = this.recentBotDeletedMessages.get(messageId);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.recentBotDeletedMessages.delete(messageId);
      return false;
    }
    return true;
  }

  /**
   * Consulta de forma segura los Audit Logs de Discord para saber quién ejecutó un cambio reciente (< 6s).
   */
  static async fetchAuditExecutor(
    guild: Guild,
    event: AuditLogEvent,
    targetId?: string,
  ): Promise<User | null> {
    try {
      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

      const logs = await guild.fetchAuditLogs({ type: event, limit: 5 });
      const now = Date.now();

      const entry = logs.entries.find((e) => {
        const isRecent = now - e.createdTimestamp < 6000;
        if (!isRecent) return false;
        if (targetId && e.targetId && e.targetId !== targetId) return false;
        return true;
      });

      return entry?.executor ? (entry.executor as User) : null;
    } catch {
      return null;
    }
  }

  private static async getLogChannel(
    guild: Guild,
    logType: LogType,
  ): Promise<TextChannel | null> {
    try {
      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings) return null;

      const channelKey = LOG_TYPE_CHANNEL[logType];
      const channelId = resolveLogChannel(settings, channelKey);
      if (!channelId) return null;

      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.isTextBased()) return channel as TextChannel;

      return null;
    } catch (err) {
      console.error("❌ Error obteniendo canal de logs:", err);
      return null;
    }
  }

  /**
   * Encola un embed para enviarlo en micro-lotes (hasta 10 embeds cada 1.2s por canal),
   * evitando golpear el Rate Limit de Discord durante eventos masivos.
   */
  private static enqueueEmbed(channel: TextChannel, embed: EmbedBuilder): void {
    const key = channel.id;
    const existing = this.batchQueues.get(key);

    if (existing) {
      existing.embeds.push(embed);
      if (existing.embeds.length >= 10) {
        clearTimeout(existing.timer);
        this.flushChannelQueue(key);
      }
      return;
    }

    const timer = setTimeout(() => {
      this.flushChannelQueue(key);
    }, this.BATCH_WINDOW_MS);

    this.batchQueues.set(key, {
      channel,
      embeds: [embed],
      timer,
    });
  }

  private static flushChannelQueue(channelId: string): void {
    const batch = this.batchQueues.get(channelId);
    if (!batch) return;
    this.batchQueues.delete(channelId);

    const chunks: EmbedBuilder[][] = [];
    for (let i = 0; i < batch.embeds.length; i += 10) {
      chunks.push(batch.embeds.slice(i, i + 10));
    }

    for (const embeds of chunks) {
      void batch.channel
        .send({ embeds, allowedMentions: { parse: [] } })
        .catch(() => null);
    }
  }

  private static getActionLabel(type: LogType): string {
    switch (type) {
      case "BAN":
        return "Ban permanente";
      case "TEMP_BAN":
        return "Ban temporal";
      case "SOFTBAN":
        return "Softban (Expulsión + Purga)";
      case "UNBAN":
        return "Desbaneo";
      case "KICK":
        return "Expulsión";
      case "MUTE":
      case "TEMP_MUTE":
        return "Silencio temporal";
      case "UNMUTE":
        return "Silencio retirado";
      case "WARN":
        return "Advertencia";
      case "UNWARN":
        return "Advertencia retirada";
      case "PURGE":
        return "Purga de mensajes";
      case "AUTOMOD":
        return "Acción automática (AutoMod)";
      case "LINKS":
        return "Protección de enlaces";
      case "MESSAGE_REVIEW":
        return "Revisión de mensaje";
      case "ANTI_NUKE":
        return "Protección Anti-Nuke";
      case "ANTI_ALT":
        return "Detección Anti-Alt";
      default:
        return "Acción de moderación";
    }
  }

  static async logAction(
    guild: Guild,
    type: LogType,
    details: {
      user?: User;
      moderator?: User;
      reason: string;
      extra?: string;
      expiresAt?: Date | number;
      duration?: string;
      warnCount?: number;
      actionLabel?: string;
      caseId?: number | string | null;
      source?: string;
      result?: string;
      channelId?: string;
    },
  ) {
    try {
      if (details.user) {
        if (type === "BAN" || type === "TEMP_BAN" || type === "SOFTBAN") {
          this.markBotModerationAction(guild.id, "BAN", details.user.id);
        }
        if (type === "UNBAN" || type === "SOFTBAN") {
          this.markBotModerationAction(guild.id, "UNBAN", details.user.id);
        }
        if (type === "KICK") {
          this.markBotModerationAction(guild.id, "KICK", details.user.id);
        }
      }

      const channel = await this.getLogChannel(guild, type);
      if (!channel) return;

      const title = this.getTitle(type);
      const color = this.COLORS[type] ?? 0x2b2d31;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Hoshiko Moderation" });

      if (details.user) {
        embed.setThumbnail(details.user.displayAvatarURL());
        embed.addFields({
          name: "Usuario",
          value: `<@${details.user.id}> (\`${details.user.tag}\`)`,
          inline: true,
        });
      }

      const sanctionName = details.actionLabel || this.getActionLabel(type);
      embed.addFields({
        name: "Acción",
        value: sanctionName,
        inline: true,
      });

      if (details.duration) {
        embed.addFields({
          name: "Duración",
          value: details.duration,
          inline: true,
        });
      }

      const isAutoMod =
        !details.moderator ||
        (details.moderator.bot && details.source === "Automatización");
      const modDisplay =
        details.moderator && !isAutoMod
          ? `<@${details.moderator.id}> (\`${details.moderator.tag}\`)`
          : "Hoshiko (Automático) 🤖";

      embed.addFields({
        name: "Responsable",
        value: modDisplay,
        inline: true,
      });

      if (details.channelId) {
        embed.addFields({
          name: "Canal",
          value: `<#${details.channelId}>`,
          inline: true,
        });
      }

      embed.addFields({
        name: "Motivo",
        value:
          details.reason && details.reason.trim().length > 0
            ? details.reason
            : "No especificado",
        inline: false,
      });

      if (details.expiresAt) {
        const unix =
          typeof details.expiresAt === "number"
            ? Math.floor(details.expiresAt / 1000)
            : Math.floor(details.expiresAt.getTime() / 1000);
        embed.addFields({
          name: "Expiración",
          value: `<t:${unix}:R> (<t:${unix}:f>)`,
          inline: true,
        });
      }

      if (typeof details.warnCount === "number") {
        embed.addFields({
          name: "Total de Warns",
          value: `\`${details.warnCount}\``,
          inline: true,
        });
      }

      if (details.extra) {
        embed.addFields({
          name: "Detalles",
          value: details.extra,
          inline: false,
        });
      }

      if (details.caseId !== undefined && details.caseId !== null) {
        embed.addFields({
          name: "Caso",
          value: `#${details.caseId}`,
          inline: true,
        });
      }

      embed.addFields(
        {
          name: "Resultado",
          value: details.result || "Ejecutado correctamente",
          inline: true,
        },
        {
          name: "Origen",
          value:
            details.source ||
            (details.moderator && !details.moderator.bot
              ? "Comando"
              : "Automatización"),
          inline: true,
        },
      );

      if (details.user) {
        embed.addFields({
          name: "Identificadores",
          value: `\`User:\` ${details.user.id}${details.moderator ? ` • \`Mod:\` ${details.moderator.id}` : ""}`,
          inline: false,
        });
      }

      // Botones contextuales de conveniencia para el staff
      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (details.user && !details.user.bot) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        if (type === "WARN") {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`modlog_act:warns:${details.user.id}`)
              .setLabel("Ver Warns")
              .setEmoji("📜")
              .setStyle(ButtonStyle.Secondary),
          );
        } else if (type === "MUTE" || type === "TEMP_MUTE") {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`modlog_act:unmute:${details.user.id}`)
              .setLabel("Desmutear")
              .setEmoji("🔊")
              .setStyle(ButtonStyle.Success),
          );
        } else if (type === "BAN" || type === "TEMP_BAN" || type === "SOFTBAN") {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`modlog_act:unban:${details.user.id}`)
              .setLabel("Desbanear")
              .setEmoji("🔓")
              .setStyle(ButtonStyle.Success),
          );
        }

        if (row.components.length > 0) {
          components.push(row);
        }
      }

      if (components.length > 0) {
        await channel
          .send({ embeds: [embed], components, allowedMentions: { parse: [] } })
          .catch(() => null);
      } else {
        this.enqueueEmbed(channel, embed);
      }
    } catch (err) {
      console.error("❌ Error en logAction:", err);
    }
  }

  /**
   * Registra un enlace detectado en #links-logs de forma neutralizada (no clicable y sin preview).
   */
  static async logLinkDetection(
    guild: Guild,
    details: {
      author: User;
      channelId: string;
      urls: string[];
      rule: string;
      actionTaken: string;
      result: string;
      severityColor?: number;
    },
  ): Promise<void> {
    try {
      const safeUrls = details.urls
        .slice(0, 5)
        .map((u) => `\`${sanitizeUrlForLog(u)}\``)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🔗 Enlace detectado")
        .setColor(details.severityColor ?? this.COLORS.LINKS)
        .addFields(
          {
            name: "Autor",
            value: `<@${details.author.id}> (\`${details.author.tag}\`)`,
            inline: true,
          },
          {
            name: "Canal",
            value: `<#${details.channelId}>`,
            inline: true,
          },
          {
            name: "Regla detectada",
            value: details.rule,
            inline: true,
          },
          {
            name: "Enlace (representación segura)",
            value: safeUrls || "`No disponible`",
            inline: false,
          },
          {
            name: "Acción ejecutada",
            value: details.actionTaken,
            inline: true,
          },
          {
            name: "Resultado",
            value: details.result,
            inline: true,
          },
          {
            name: "ID de usuario",
            value: `\`${details.author.id}\``,
            inline: true,
          },
        )
        .setFooter({ text: "Hoshiko Logs • #links-logs" })
        .setTimestamp();

      if (typeof details.author?.displayAvatarURL === "function") {
        embed.setThumbnail(details.author.displayAvatarURL());
      }

      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      const row = this.buildInteractiveRow("AUTOMOD", details.author);
      if (row) components.push(row);

      await this.sendToChannel(guild, "linkslog", embed, components);
    } catch (err) {
      console.error("❌ Error en logLinkDetection:", err);
    }
  }

  private static getTitle(type: LogType): string {
    switch (type) {
      case "BAN":
      case "TEMP_BAN":
        return "🔨 Usuario baneado";
      case "SOFTBAN":
        return "🔄 Usuario softbaneado";
      case "UNBAN":
        return "🔓 Usuario desbaneado";
      case "KICK":
        return "👢 Usuario expulsado";
      case "MUTE":
      case "TEMP_MUTE":
        return "🔇 Usuario silenciado";
      case "UNMUTE":
        return "🔊 Silencio retirado";
      case "WARN":
        return "⚠️ Advertencia emitida";
      case "UNWARN":
        return "😇 Advertencia retirada";
      case "PURGE":
        return "🧹 Mensajes purgados";
      case "AUTOMOD":
        return "🤖 Intervención automática (AutoMod)";
      case "LINKS":
        return "🔗 Enlace detectado";
      case "MESSAGE_REVIEW":
        return "🔎 Mensaje en revisión";
      case "ANTI_NUKE":
        return "🚨 Alerta crítica: Anti-Nuke";
      case "ANTI_ALT":
        return "🕵️ Cuenta reciente detectada (Anti-Alt)";
      case "CONFIG":
        return "⚙️ Configuración modificada";
      default:
        return "🛡️ Registro de moderación";
    }
  }

  /**
   * Construye la fila de botones interactivos para incidentes automáticos donde hay un usuario infractor.
   */
  private static buildInteractiveRow(
    type: LogType,
    target: User,
  ): ActionRowBuilder<ButtonBuilder> | null {
    const actionableTypes: LogType[] = [
      "AUTOMOD",
      "LINKS",
      "ANTI_ALT",
      "ANTI_NUKE",
      "SECURITY",
      "WARN",
      "MUTE",
    ];
    if (!actionableTypes.includes(type) || target.bot) return null;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`modlog_act:timeout:${target.id}`)
        .setLabel("Aislar 1h")
        .setEmoji("🔇")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`modlog_act:ban:${target.id}`)
        .setLabel("Banear")
        .setEmoji("🔨")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`modlog_act:purge:${target.id}`)
        .setLabel("Purgar Msgs")
        .setEmoji("🧹")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`modlog_act:forgive:${target.id}`)
        .setLabel("Falso Positivo")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
    );
  }

  static async sendLog(
    guild: Guild,
    type: LogType,
    description: string,
    target?: User,
    messageUrl?: string,
  ) {
    try {
      const channel = await this.getLogChannel(guild, type);
      if (!channel) return;

      const title = this.getTitle(type);
      const color = this.COLORS[type] ?? 0x2b2d31;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({
          text:
            type === "CONFIG" ? "Hoshiko Logs" : "Hoshiko Moderation",
        });

      if (target) {
        embed.setThumbnail(target.displayAvatarURL());
        embed.addFields(
          {
            name: "Usuario afectado",
            value: `<@${target.id}> (\`${target.tag}\`)`,
            inline: true,
          },
          {
            name: "Responsable",
            value: "Hoshiko (Automático) 🤖",
            inline: true,
          },
        );
      }

      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      const actionRow = target ? this.buildInteractiveRow(type, target) : null;
      if (actionRow) components.push(actionRow);
      if (messageUrl) {
        components.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Ir al Mensaje")
              .setEmoji("🔗")
              .setStyle(ButtonStyle.Link)
              .setURL(messageUrl),
          ),
        );
      }

      if (components.length > 0) {
        await channel
          .send({ embeds: [embed], components, allowedMentions: { parse: [] } })
          .catch(() => null);
      } else {
        this.enqueueEmbed(channel, embed);
      }
    } catch (err) {
      console.error("❌ Error en sendLog:", err);
    }
  }

  /**
   * Envía un log a un canal específico por clave (ej: "modlog", "messagelog", "messagereview", "linkslog", "voicelog", "serverlog").
   * Verifica licencia Premium para canales exclusivos y usa micro-batching.
   */
  static async sendToChannel(
    guild: Guild,
    channelKey: keyof ILogChannels | string,
    embed: EmbedBuilder,
    components?: ActionRowBuilder<ButtonBuilder>[],
  ): Promise<void> {
    try {
      const key = channelKey as keyof ILogChannels;

      // Validar licencia si es un canal exclusivo Premium
      if (PREMIUM_LOG_CHANNELS.has(key)) {
        const isPremium = await PremiumManager.isPremium(guild.id);
        if (!isPremium) return;
      }

      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings) return;

      const channelId = resolveLogChannel(settings, key, guild);
      if (!channelId) return;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return;

      const textChannel = channel as TextChannel;
      if (components && components.length > 0) {
        await textChannel
          .send({ embeds: [embed], components, allowedMentions: { parse: [] } })
          .catch(() => null);
      } else {
        this.enqueueEmbed(textChannel, embed);
      }
    } catch (err) {
      console.error(`❌ Error enviando log a ${channelKey}:`, err);
    }
  }

  static async log(entry: Omit<LogEntry, "timestamp">) {
    const fullEntry: LogEntry = { ...entry, timestamp: new Date() };

    const colors: Record<LogLevel, string> = {
      [LogLevel.INFO]: "\x1b[36m",
      [LogLevel.SUCCESS]: "\x1b[32m",
      [LogLevel.WARN]: "\x1b[33m",
      [LogLevel.ERROR]: "\x1b[31m",
      [LogLevel.FATAL]: "\x1b[35m",
    };
    console.log(
      `${colors[entry.level] || ""}[${fullEntry.timestamp.toISOString()}] [${entry.level}] [${entry.context}]: ${entry.message}\x1b[0m`,
    );

    try {
      LocalStorage.save(fullEntry);
    } catch {}

    if (
      this.webhookClient &&
      (entry.level === LogLevel.FATAL || entry.level === LogLevel.ERROR)
    ) {
      void this.sendToDiscord(fullEntry).catch((err) => {
        console.error("⚠️ No se pudo enviar el log al Webhook:", err);
      });
    }
  }

  private static async sendToDiscord(entry: LogEntry) {
    if (!this.webhookClient) return;

    const embed = new EmbedBuilder()
      .setTitle(`Hoshiko System • ${entry.level}`)
      .setDescription(entry.message)
      .setColor(entry.level === LogLevel.FATAL ? 0xed4245 : 0xfaa61a)
      .addFields(
        { name: "Contexto", value: entry.context, inline: true },
        { name: "Servidor ID", value: entry.guildId || "N/A", inline: true },
      )
      .setFooter({ text: "Hoshiko Internal Monitor" })
      .setTimestamp(entry.timestamp);

    await this.webhookClient.send({ embeds: [embed] });
  }
}
