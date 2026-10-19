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
  | "SOFTBAN"
  | "UNBAN"
  | "KICK"
  | "MUTE"
  | "UNMUTE"
  | "WARN"
  | "UNWARN"
  | "AUTOMOD"
  | "CONFIG"
  | "SECURITY"
  | "ANTI_ALT"
  | "ANTI_NUKE"
  | "VERIFICATION";

const LOG_TYPE_CHANNEL: Record<LogType, keyof ILogChannels> = {
  BAN: "modlog",
  SOFTBAN: "modlog",
  UNBAN: "modlog",
  KICK: "modlog",
  MUTE: "modlog",
  UNMUTE: "modlog",
  WARN: "modlog",
  UNWARN: "modlog",
  AUTOMOD: "modlog",
  CONFIG: "serverlog",
  SECURITY: "modlog",
  ANTI_ALT: "joinlog",
  ANTI_NUKE: "modlog",
  VERIFICATION: "joinlog",
};

export const PREMIUM_LOG_CHANNELS = new Set<keyof ILogChannels>([
  "messagelog",
  "voicelog",
  "boostlog",
  "levellog",
]);

/**
 * Resolución híbrida de canales de log:
 * 1. Canal específico (modlog, serverlog, etc.)
 * 2. Fallback a "all" (salvo confesslog para proteger privacidad de confesiones)
 * 3. Fallback a campos deprecados (modLogChannel / confessions.logsChannelId)
 */
export function resolveLogChannel(
  settings: IServerConfig,
  channelType: keyof ILogChannels,
): string | null {
  const channels = settings.logChannels;

  if (channels?.[channelType]) return channels[channelType];

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
    SOFTBAN: 0xff6600,
    UNBAN: 0x57f287,
    KICK: 0xff5500,
    MUTE: 0xfaa61a,
    UNMUTE: 0x57f287,
    WARN: 0xfee75c,
    UNWARN: 0x57f287,
    AUTOMOD: 0xff69b4,
    CONFIG: 0x5865f2,
    SECURITY: 0x2b2d31,
    ANTI_ALT: 0xfaa61a,
    ANTI_NUKE: 0xed4245,
    VERIFICATION: 0x57f287,
  };

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
      void batch.channel.send({ embeds }).catch(() => null);
    }
  }

  private static getActionLabel(type: LogType): string {
    switch (type) {
      case "BAN":
        return "Ban Permanente";
      case "SOFTBAN":
        return "Softban (Expulsión + Purga)";
      case "UNBAN":
        return "Desbaneo";
      case "KICK":
        return "Expulsión";
      case "MUTE":
        return "Silencio (Timeout)";
      case "UNMUTE":
        return "Silencio Retirado";
      case "WARN":
        return "Advertencia";
      case "UNWARN":
        return "Advertencia Retirada";
      case "AUTOMOD":
        return "Acción Automática";
      case "ANTI_NUKE":
        return "Protección Anti-Nuke";
      case "ANTI_ALT":
        return "Detección Anti-Alt";
      default:
        return "Acción de Moderación";
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
      warnCount?: number;
      actionLabel?: string;
    },
  ) {
    try {
      const channel = await this.getLogChannel(guild, type);
      if (!channel) return;

      const title = this.getTitle(type);
      const color = this.COLORS[type] ?? 0x2b2d31;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `🛡️ Moderación • ${guild.name}`,
          iconURL: guild.iconURL() ?? undefined,
        })
        .setTitle(title)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Hoshiko Security Center" });

      if (details.user) {
        embed.setThumbnail(details.user.displayAvatarURL());
      }

      // Fila 1: Datos clave en grid de 3 columnas
      if (details.user) {
        embed.addFields({
          name: "👤 Usuario",
          value: `<@${details.user.id}>\n\`${details.user.tag}\``,
          inline: true,
        });
      }

      const modDisplay = details.moderator
        ? `<@${details.moderator.id}>\n\`${details.moderator.tag}\``
        : "Hoshiko (Automático) 🤖";
      embed.addFields({
        name: "👮 Moderador",
        value: modDisplay,
        inline: true,
      });

      const sanctionName = details.actionLabel || this.getActionLabel(type);
      embed.addFields({
        name: "⚖️ Sanción",
        value: sanctionName,
        inline: true,
      });

      // Fila 2: Motivo
      embed.addFields({
        name: "📝 Razón",
        value: details.reason && details.reason.trim().length > 0
          ? details.reason
          : "No especificada.",
        inline: false,
      });

      // Fila 3: Tiempo relativo o métricas adicionales
      if (details.expiresAt) {
        const unix =
          typeof details.expiresAt === "number"
            ? Math.floor(details.expiresAt / 1000)
            : Math.floor(details.expiresAt.getTime() / 1000);
        embed.addFields({
          name: "⏳ Expiración",
          value: `<t:${unix}:R> (<t:${unix}:f>)`,
          inline: true,
        });
      }

      if (typeof details.warnCount === "number") {
        embed.addFields({
          name: "📊 Total de Warns",
          value: `\`${details.warnCount}\``,
          inline: true,
        });
      }

      if (details.extra) {
        embed.addFields({
          name: "ℹ️ Detalles adicionales",
          value: details.extra,
          inline: false,
        });
      }

      // Fila 4: IDs
      if (details.user) {
        embed.addFields({
          name: "🆔 Identificadores",
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
        } else if (type === "MUTE") {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`modlog_act:unmute:${details.user.id}`)
              .setLabel("Desmutear")
              .setEmoji("🔊")
              .setStyle(ButtonStyle.Success),
          );
        } else if (type === "BAN" || type === "SOFTBAN") {
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

  private static getTitle(type: LogType): string {
    switch (type) {
      case "BAN":
        return "⛔ Usuario Baneado";
      case "SOFTBAN":
        return "🔄 Usuario Softbaneado";
      case "UNBAN":
        return "🔓 Usuario Desbaneado";
      case "KICK":
        return "👢 Usuario Expulsado";
      case "MUTE":
        return "😶 Usuario Silenciado";
      case "UNMUTE":
        return "🔊 Silencio Retirado";
      case "WARN":
        return "⚠️ Advertencia Emitida";
      case "UNWARN":
        return "😇 Advertencia Retirada";
      case "AUTOMOD":
        return "🤖 Intervención Automática (Automod)";
      case "ANTI_NUKE":
        return "🚨 Alerta Crítica: Anti-Nuke";
      case "ANTI_ALT":
        return "🕵️ Cuenta Reciente Detectada (Anti-Alt)";
      case "CONFIG":
        return "⚙️ Configuración Modificada";
      default:
        return "🛡️ Reporte de Seguridad";
    }
  }

  /**
   * Construye la fila de botones interactivos (Centro de Comando - Pilar 5)
   * para incidentes automáticos donde hay un usuario infractor.
   */
  private static buildInteractiveRow(
    type: LogType,
    target: User,
  ): ActionRowBuilder<ButtonBuilder> | null {
    const actionableTypes: LogType[] = [
      "AUTOMOD",
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
      new ButtonBuilder()
        .setCustomId(`modlog_act:sentinel:${target.id}`)
        .setLabel("Sentinel")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Danger),
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
        .setFooter({ text: "Hoshiko Security Center" });

      if (target) {
        embed.setThumbnail(target.displayAvatarURL());
        embed.addFields({
          name: "Usuario Afectado",
          value: `${target.tag} \`(${target.id})\``,
          inline: true,
        });
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
          .send({ embeds: [embed], components })
          .catch(() => null);
      } else {
        this.enqueueEmbed(channel, embed);
      }
    } catch (err) {
      console.error("❌ Error en sendLog:", err);
    }
  }

  /**
   * Envía un log a un canal específico por clave (ej: "joinlog", "serverlog", "messagelog").
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

      const channelId = resolveLogChannel(settings, key);
      if (!channelId) return;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return;

      const textChannel = channel as TextChannel;
      if (components && components.length > 0) {
        await textChannel.send({ embeds: [embed], components }).catch(() => null);
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

