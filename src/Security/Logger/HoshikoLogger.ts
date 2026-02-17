import {
  EmbedBuilder,
  Guild,
  User,
  TextChannel,
  ColorResolvable,
} from "discord.js";
import { SettingsManager } from "../../Database/SettingsManager";
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

// Tipos de acciones de moderación soportadas
export type LogType =
  | "BAN"
  | "KICK"
  | "MUTE"
  | "WARN"
  | "UNWARN"
  | "AUTOMOD"
  | "CONFIG"
  | "SECURITY";

export class HoshikoLogger {
  private static webhookUrl = process.env.LOGS_WEBHOOK_URL;

  // Colores por tipo para embeds de moderación
  private static readonly COLORS: Record<LogType, number> = {
    BAN: 0xff0000, // Rojo
    KICK: 0xff5500, // Naranja oscuro
    MUTE: 0xffa500, // Naranja
    WARN: 0xffff00, // Amarillo
    UNWARN: 0x00ff00, // Verde
    AUTOMOD: 0xff69b4, // Rosa (Hoshiko Style)
    CONFIG: 0x0099ff, // Azul
    SECURITY: 0x000000, // Negro
  };

  /**
   * Crea y envía un log de moderación al canal configurado en el servidor.
   * Incluye información sobre usuario afectado, moderador y motivo.
   */
  static async logAction(
    guild: Guild,
    type: LogType,
    details: {
      user?: User; // El criminal
      moderator?: User; // El policía (si es null, es Hoshiko)
      reason: string; // La razón
      extra?: string; // Detalles extra (ej: duración mute)
    },
  ) {
    const color = this.COLORS[type];
    const title = this.getTitle(type);

    // Construimos una descripción rica y detallada
    let description = `**Razón:** ${details.reason}`;

    if (details.extra) description += `\n**Detalles:** ${details.extra}`;

    // Añadimos quién fue el responsable
    const modName = details.moderator
      ? details.moderator.tag
      : "Hoshiko (Automático) 🤖";
    description += `\n**Moderador:** ${modName}`;

    // Reutilizamos tu método base para enviarlo
    await this.sendLog(guild, title, description, color, details.user);
  }

  /** Título resumido para cada tipo de `LogType`. */
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

  /**
   * Envía un embed al canal de moderación configurado en `Settings`.
   * Si no existe canal o no hay permisos, falla silenciosamente.
   */
  static async sendLog(
    guild: Guild,
    title: string,
    description: string,
    color: number,
    target?: User,
  ) {
    try {
      const settings = await SettingsManager.getSettings(guild.id);
      if (!settings || !settings.modLogChannel) return;

      const logChannel = guild.channels.cache.get(settings.modLogChannel);
      if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(color)
          .setTimestamp()
          .setFooter({ text: "Hoshiko Sentinel 📡" });

        if (target) {
          embed.setThumbnail(target.displayAvatarURL());
          embed.addFields({
            name: "Usuario Afectado",
            value: `${target.tag} \`(${target.id})\``,
            inline: true,
          });
        }

        await (logChannel as TextChannel)
          .send({ embeds: [embed] })
          .catch(() => null);
      }
    } catch (err) {
      console.error("❌ Error en sendLog (Canal):", err);
    }
  }

  /**
   * Registro interno: consola, almacenamiento local y envío a webhook en errores críticos.
   */
  static async log(entry: Omit<LogEntry, "timestamp">) {
    const fullEntry: LogEntry = { ...entry, timestamp: new Date() };

    // 1. Consola
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

    // 2. LocalStorage
    try {
      LocalStorage.save(fullEntry);
    } catch {}

    // 3. Webhook de Seguridad
    if (
      this.webhookUrl &&
      (entry.level === LogLevel.FATAL || entry.level === LogLevel.ERROR)
    ) {
      await this.sendToDiscord(fullEntry).catch((err) => {
        console.error("⚠️ No se pudo enviar el log al Webhook:", err.message);
      });
    }
  }

  private static async sendToDiscord(entry: LogEntry) {
    if (!this.webhookUrl) return;

    const payload = {
      embeds: [
        {
          title: `Hoshiko System • ${entry.level}`,
          description: entry.message,
          color: entry.level === LogLevel.FATAL ? 0xff0000 : 0xffa500,
          fields: [
            { name: "Contexto", value: entry.context, inline: true },
            {
              name: "Servidor ID",
              value: entry.guildId || "N/A",
              inline: true,
            },
          ],
          footer: { text: "Hoshiko Internal Monitor" },
          timestamp: entry.timestamp,
        },
      ],
    };

    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error("Fallo de red al conectar con el Webhook");
    }
  }
}
