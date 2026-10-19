import fs from "fs";
import path from "path";
import { LogEntry } from "./HoshikoLogger";

const LOG_DIR = path.join(process.cwd(), "logs");

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
   * Guarda una entrada de log de forma asíncrona no bloqueante en archivo rotativo .jsonl
   */
  static save(entry: LogEntry) {
    try {
      const line =
        JSON.stringify({
          timestamp:
            entry.timestamp instanceof Date
              ? entry.timestamp.toISOString()
              : entry.timestamp,
          level: entry.level,
          context: entry.context,
          message: entry.message,
          guildId: entry.guildId ?? null,
          userId: entry.userId ?? null,
          metadata: entry.metadata ?? null,
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

