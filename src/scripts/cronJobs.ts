import fs from "node:fs";
import path from "node:path";
import cron, { type ScheduledTask } from "node-cron";
import { processMissedCycles } from "../Services/StreakService";
import { TempModerationService } from "../Services/TempModerationService";
import type { HoshikoClient } from "../client/HoshikoClient";

/**
 * Registra todos los cron jobs del bot.
 * Llamar una sola vez desde src/index.ts después de conectar a MongoDB.
 * 
 * Jobs activos:
 *   - processMissedCycles: cada 15 minutos
 *     Detecta grupos con ciclos vencidos (ventana 24h expirada)
 *     y aplica la lógica de freeze/reset según cuántos miembros fallaron.
 *     Es idempotente: puede correr múltiples veces sin efectos secundarios.
 *   - cleanOldLogs: diaria a las 03:00
 *     Purga archivos de log rotativos .jsonl que excedan el período de retención (14 días).
 */
let streakCronTask: ScheduledTask | null = null;
let logCleanupCronTask: ScheduledTask | null = null;

export interface LogCleanResult {
  deletedFiles: string[];
  skippedFiles: string[];
  errors: string[];
}

export async function cleanOldLogs(options?: {
  logDir?: string;
  maxAgeDays?: number;
}): Promise<LogCleanResult> {
  const logDir = options?.logDir ?? path.join(process.cwd(), "logs");
  const maxAgeDays = options?.maxAgeDays ?? 14;
  const result: LogCleanResult = { deletedFiles: [], skippedFiles: [], errors: [] };

  if (!fs.existsSync(logDir)) {
    return result;
  }

  try {
    const files = await fs.promises.readdir(logDir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const match = file.match(/^hoshiko-(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (!match) {
        result.skippedFiles.push(file);
        continue;
      }

      const filePath = path.join(logDir, file);
      try {
        const fileDate = new Date(`${match[1]}T00:00:00Z`);
        const isOldByDate = !isNaN(fileDate.getTime()) && now - fileDate.getTime() > maxAgeMs;

        let shouldDelete = isOldByDate;
        if (!shouldDelete) {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            shouldDelete = true;
          }
        }

        if (shouldDelete) {
          await fs.promises.unlink(filePath);
          result.deletedFiles.push(file);
        } else {
          result.skippedFiles.push(file);
        }
      } catch (fileErr) {
        result.errors.push(`${file}: ${(fileErr as Error).message}`);
      }
    }
  } catch (dirErr) {
    result.errors.push(`readdir: ${(dirErr as Error).message}`);
  }

  return result;
}

export function startCronJobs(client: HoshikoClient): void {
  TempModerationService.start(client);

  if (streakCronTask) {
    streakCronTask.stop();
  }

  streakCronTask = cron.schedule("*/15 * * * *", async () => {
    const result = await processMissedCycles(client);

    if (result.errors.length > 0) {
      console.error(
        `[Cron] processMissedCycles completó con ${result.errors.length} error(es):`,
        result.errors
      );
    }
  });

  if (logCleanupCronTask) {
    logCleanupCronTask.stop();
  }

  // Rutina diaria a las 03:00 para purgar logs .jsonl de más de 14 días
  logCleanupCronTask = cron.schedule("0 3 * * *", async () => {
    try {
      const cleanResult = await cleanOldLogs();
      if (cleanResult.deletedFiles.length > 0) {
        console.log(
          `[Cron] cleanOldLogs purgó ${cleanResult.deletedFiles.length} archivo(s) antiguo(s)`
        );
      }
      if (cleanResult.errors.length > 0) {
        console.error("[Cron] cleanOldLogs encontró errores:", cleanResult.errors);
      }
    } catch (err) {
      console.error("[Cron] cleanOldLogs falló:", err);
    }
  });
}

export function stopCronJobs(): void {
  if (streakCronTask) {
    streakCronTask.stop();
    streakCronTask = null;
  }
  if (logCleanupCronTask) {
    logCleanupCronTask.stop();
    logCleanupCronTask = null;
  }
  TempModerationService.stop();
}
