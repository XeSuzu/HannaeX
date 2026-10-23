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
 */
let streakCronTask: ScheduledTask | null = null;

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
}

export function stopCronJobs(): void {
  if (streakCronTask) {
    streakCronTask.stop();
    streakCronTask = null;
  }
  TempModerationService.stop();
}
