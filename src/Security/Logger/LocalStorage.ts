import fs from "fs";
import path from "path";
import { LogEntry } from "./HoshikoLogger";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "hoshiko-logs.jsonl");

export class LocalStorage {
  /**
   * Guarda una entrada de log en un archivo físico .jsonl
   */
  static save(entry: LogEntry) {
    try {
      // 1. Crear la carpeta de logs si no existe 📁
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      // 2. Formatear la línea (incluyendo la metadata que faltaba) ✨
      const line = JSON.stringify({
        timestamp:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : entry.timestamp,
        level: entry.level,
        context: entry.context,
        message: entry.message,
        guildId: entry.guildId ?? null,
        userId: entry.userId ?? null,
        metadata: entry.metadata ?? null, // ✅ Ahora TS lo reconoce
      });

      // 3. Escribir al final del archivo
      fs.appendFileSync(LOG_FILE, line + "\n", { encoding: "utf8" });
    } catch (err) {
      // El logger nunca debe detener la aplicación 🛡️
      console.error(
        "❌ LocalStorage.save falló:",
        (err as Error).message || err,
      );
    }
  }
}
