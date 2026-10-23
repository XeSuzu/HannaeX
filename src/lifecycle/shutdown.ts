import type { HoshikoClient } from "../client/HoshikoClient";
import { ShutdownService } from "../App/bootstrap/ShutdownService";
import { stopCronJobs } from "../scripts/cronJobs";
import { setFatalErrorHandler } from "../Utils/antiCrash";

let isShuttingDown = false;
let killTimer: NodeJS.Timeout | null = null;

export function installShutdownHandlers(
  client: HoshikoClient,
  closeHealthServer: () => Promise<void> | void = () => undefined,
): void {
  const destroyDiscord = async (): Promise<void> => {
    await client.destroy();
  };

  const handleShutdown = async (
    source: string,
    expectedExitCode: number,
  ): Promise<void> => {
    // 3. Evita que varias señales o errores inicien simultáneamente múltiples secuencias de apagado.
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    // 1 & 6. Temporizador de seguridad de 5s: fuerza salida si se bloquea la limpieza
    killTimer = setTimeout(() => {
      console.log(`[KillSwitch] Forzando cierre tras 5s (origen: ${source}).`);
      process.exit(expectedExitCode !== 0 ? expectedExitCode : 1);
    }, 5000);
    killTimer.unref();

    try {
      // 2. Detén los cron jobs durante el apagado ordenado.
      stopCronJobs();

      const allClean = await ShutdownService.shutdown(
        source,
        destroyDiscord,
        closeHealthServer,
      );

      // 1. Limpia el temporizador de seguridad cuando el apagado termina correctamente
      if (killTimer) {
        clearTimeout(killTimer);
        killTimer = null;
      }

      // 5. El apagado por error no recuperable debe terminar con código de salida 1.
      // El apagado normal debe terminar con código 0. Un fallo de limpieza termina con 1.
      const exitCode = !allClean || expectedExitCode !== 0 ? 1 : 0;
      process.exit(exitCode);
    } catch (error) {
      if (killTimer) {
        clearTimeout(killTimer);
        killTimer = null;
      }
      console.error("[Shutdown] Error crítico durante el apagado:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM", 0);
  });

  process.on("SIGINT", () => {
    void handleShutdown("SIGINT", 0);
  });

  // 4. En uncaughtException, inicia el apagado ordenado una sola vez con código 1.
  setFatalErrorHandler(async (_error) => {
    await handleShutdown("uncaughtException", 1);
  });
}

export function _resetShutdownStateForTesting(): void {
  isShuttingDown = false;
  if (killTimer) {
    clearTimeout(killTimer);
    killTimer = null;
  }
}
