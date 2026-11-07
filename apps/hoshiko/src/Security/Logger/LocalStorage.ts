import fs from "fs";
import path from "path";
import { LogEntry } from "./HoshikoLogger";

const LOG_DIR = path.join(process.cwd(), "logs");

const SECRET_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  {
    regex: /Bot\s+[a-zA-Z0-9_\-.]{50,}/gi,
    replacement: "Bot [REDACTED_DISCORD_TOKEN]",
  },
  {
    regex: /(?:[\w-]{24,28}\.[\w-]{6}\.[\w-]{27,38})/g,
    replacement: "[REDACTED_DISCORD_TOKEN]",
  },
  {
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    replacement: "[REDACTED_GOOGLE_API_KEY]",
  },
  {
    regex:
      /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_\-]+/gi,
    replacement: "https://discord.com/api/webhooks/[REDACTED_WEBHOOK]",
  },
];

const SENSITIVE_KEY_NAMES = new Set([
  "authorization",
  "auth",
  "token",
  "apikey",
  "api_key",
  "secret",
  "password",
  "gemini_api_key",
  "discord_token",
]);

export function sanitizeSecrets(value: any, depth = 0): any {
  if (depth > 10 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    let sanitized = value;
    for (const { regex, replacement } of SECRET_PATTERNS) {
      sanitized = sanitized.replace(regex, replacement);
    }
    return sanitized;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSecrets(item, depth + 1));
  }

  if (typeof value === "object") {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_NAMES.has(k.toLowerCase())) {
        cleaned[k] = "[REDACTED_SECRET]";
      } else {
        cleaned[k] = sanitizeSecrets(v, depth + 1);
      }
    }
    return cleaned;
  }

  return value;
}

export class LocalStorage {
  private static currentDateKey = "";
  private static stream: fs.WriteStream | null = null;
  private static dirEnsured = false;

  private static getStream(): fs.WriteStream | null {
    try {
      if (!this.dirEnsured) {
        if (!fs.existsSync(LOG_DIR)) {
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        this.dirEnsured = true;
      }

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      if (this.currentDateKey !== today || !this.stream) {
        if (this.stream) {
          this.stream.end();
        }
        this.currentDateKey = today;
        const filePath = path.join(LOG_DIR, `hoshiko-${today}.jsonl`);
        this.stream = fs.createWriteStream(filePath, {
          flags: "a",
          encoding: "utf8",
        });
        this.stream.on("error", (err) => {
          console.error("❌ LocalStorage stream error:", err.message);
          this.stream = null;
        });
      }

      return this.stream;
    } catch (err) {
      console.error(
        "❌ LocalStorage.getStream falló:",
        (err as Error).message || err,
      );
      return null;
    }
  }

  /**
   * Guarda una entrada de log de forma asíncrona no bloqueante en archivo rotativo .jsonl,
   * redactando previamente secretos, tokens y claves de API en metadata y mensaje (AUD-12).
   */
  static save(entry: LogEntry) {
    try {
      const sanitizedMetadata = entry.metadata
        ? sanitizeSecrets(entry.metadata)
        : null;
      const sanitizedMessage =
        typeof entry.message === "string"
          ? sanitizeSecrets(entry.message)
          : entry.message;

      const line =
        JSON.stringify({
          timestamp:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString()
              : entry.timestamp,
          level: entry.level,
          context: entry.context,
          message: sanitizedMessage,
          guildId: entry.guildId ?? null,
          userId: entry.userId ?? null,
          metadata: sanitizedMetadata,
        }) + "\n";

      const stream = this.getStream();
      if (stream) {
        stream.write(line);
      }
    } catch (err) {
      console.error(
        "❌ LocalStorage.save falló:",
        (err as Error).message || err,
      );
    }
  }
}

