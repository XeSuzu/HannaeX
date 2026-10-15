import type { HoshikoClient } from "../client/HoshikoClient";
import { ShutdownService } from "../App/bootstrap/ShutdownService";

export function installShutdownHandlers(
  client: HoshikoClient,
  closeHealthServer: () => Promise<void> | void = () => undefined,
): void {
  const destroyDiscord = async (): Promise<void> => {
    await client.destroy();
  };

  process.on("SIGTERM", () => {
    setTimeout(() => { console.log('[KillSwitch] Forzando cierre tras 5s.'); process.exit(0); }, 5000);
    void ShutdownService.shutdown(
      "SIGTERM",
      destroyDiscord,
      closeHealthServer,
    );
  });

  process.on("SIGINT", () => {
    setTimeout(() => { console.log('[KillSwitch] Forzando cierre tras 5s.'); process.exit(0); }, 5000);
    void ShutdownService.shutdown(
      "SIGINT",
      destroyDiscord,
      closeHealthServer,
    );
  });
}
