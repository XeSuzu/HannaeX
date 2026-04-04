import {
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
  WebhookClient,
} from "discord.js";
import { SettingsManager } from "../../Database/SettingsManager";
import { ILogChannels, IServerConfig } from "../../Models/serverConfig";
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
  | "KICK"
  | "MUTE"
  | "WARN"
  | "UNWARN"
  | "AUTOMOD"
  | "CONFIG"
  | "SECURITY"
  | "ANTI_ALT"
  | "ANTI_NUKE"
  | "VERIFICATION";

// Mapeo de LogType al canal correspondiente en logChannels
const LOG_TYPE_CHANNEL: Record<LogType, string> = {
  BAN: "modlog",
  KICK: "modlog",
  MUTE: "modlog",
  WARN: "modlog",
  UNWARN: "modlog",
  AUTOMOD: "modlog",
  CONFIG: "serverlog",
  SECURITY: "modlog",
  ANTI_ALT: "joinlog",
  ANTI_NUKE: "modlog",
  VERIFICATION: "joinlog",
};

// ⚙️ Helper para resolución de canales de log
// Primero busca específico → luego fallback a "all" → luego null
export function resolveLogChannel(
  settings: IServerConfig,
  channelType: keyof ILogChannels,
): string | null {
  const channels = settings.logChannels;
  if (!channels) return null;

  // 1. Buscar canal específico (modlog, serverlog, etc.)
  if (channels[channelType]) return channels[channelType];

  // 2. Fallback al canal general "all"
  if (channels.all) return channels.all;

  // 3. Fallback al campo deprecado (para migración)
  if (channelType === "modlog" && (settings as any).modLogChannel) {
    return (settings as any).modLogChannel;
  }

  return null;
}

export class HoshikoLogger {
  private static webhookClient: WebhookClient | null = null;

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
    BAN: 0xff0000,
    KICK: 0xff5500,
    MUTE: 0xffa500,
    WARN: 0xffff00,
    UNWARN: 0x00ff00,
    AUTOMOD: 0xff69b4,
    CONFIG: 0x0099ff,
    SECURITY: 0x000000,
    ANTI_ALT: 0xffa500,
    ANTI_NUKE: 0xff0000,
    VERIFICATION: 0x00ff00,
  };

  /**
   * Obtiene el canal de logs correspondiente al tipo de acción.
   * Usa resolución híbrida: específico → all → null
   */
  private static async getLogChannel(
    guild: Guild,
    logType: LogType,
  ): Promise<TextChannel | null> {
    try {
      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings) return null;

      const channelKey = LOG_TYPE_CHANNEL[logType];
      const channelId = resolveLogChannel(
        settings,
        channelKey as keyof ILogChannels,
      );

      if (!channelId) return null;

      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.isTextBased()) return channel as TextChannel;

      return null;
    } catch (err) {
      console.error("❌ Error obteniendo canal de logs:", err);
      return null;
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
    },
  ) {
    const color = this.COLORS[type];
    const title = this.getTitle(type);

    let description = `**Razón:** ${details.reason}`;
    if (details.extra) description += `\n**Detalles:** ${details.extra}`;

    const modName = details.moderator
      ? details.moderator.tag
      : "Hoshiko (Automático) 🤖";
    description += `\n**Moderador:** ${modName}`;

    await this.sendLog(guild, type, description, details.user);
  }

  private static getTitle(type: LogType): string {
    switch (type) {
      case "BAN":
        return "⛔ Usuario Baneado";
      case "KICK":
        return "👢 Usuario Expulsado";
      case "MUTE":
        return "😶 Usuario Silenciado";
      case "WARN":
        return "⚠️ Advertencia Emitida";
      case "UNWARN":
        return "😇 Sanción Retirada";
      case "AUTOMOD":
        return "🤖 Acción Automática";
      case "CONFIG":
        return "⚙️ Configuración Modificada";
      default:
        return "🛡️ Reporte de Seguridad";
    }
  }

  static async sendLog(
    guild: Guild,
    type: LogType,
    description: string,
    target?: User,
  ) {
    try {
      const channel = await this.getLogChannel(guild, type);
      if (!channel) return;

      const title = this.getTitle(type);
      const color = this.COLORS[type] ?? 0x000000;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Hoshiko Logger" });

      if (target) {
        embed.setThumbnail(target.displayAvatarURL());
        embed.addFields({
          name: "Usuario Afectado",
          value: `${target.tag} \`(${target.id})\``,
          inline: true,
        });
      }

      await channel.send({ embeds: [embed] }).catch(() => null);
    } catch (err) {
      console.error("❌ Error en sendLog:", err);
    }
  }

  /**
   * Envía un log a un canal específico por clave (ej: "joinlog", "serverlog")
   * Usa resolución híbrida: específico → all → null
   */
  static async sendToChannel(
    guild: Guild,
    channelKey: string,
    embed: EmbedBuilder,
  ): Promise<void> {
    try {
      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings) return;

      const channelId = resolveLogChannel(
        settings,
        channelKey as keyof ILogChannels,
      );
      if (!channelId) return;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return;

      await (channel as TextChannel)
        .send({ embeds: [embed] })
        .catch(() => null);
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
      await this.sendToDiscord(fullEntry).catch((err) => {
        console.error("⚠️ No se pudo enviar el log al Webhook:", err);
      });
    }
  }

  private static async sendToDiscord(entry: LogEntry) {
    if (!this.webhookClient) return;

    const embed = new EmbedBuilder()
      .setTitle(`Hoshiko System • ${entry.level}`)
      .setDescription(entry.message)
      .setColor(entry.level === LogLevel.FATAL ? 0xff0000 : 0xffa500)
      .addFields(
        { name: "Contexto", value: entry.context, inline: true },
        { name: "Servidor ID", value: entry.guildId || "N/A", inline: true },
      )
      .setFooter({ text: "Hoshiko Internal Monitor" })
      .setTimestamp(entry.timestamp);

    await this.webhookClient.send({ embeds: [embed] });
  }
}
