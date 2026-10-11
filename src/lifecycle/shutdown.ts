import type { HoshikoClient } from "../client/HoshikoClient";
import { ShutdownService } from "../App/bootstrap/ShutdownService";

export function installShutdownHandlers(client: HoshikoClient): void {
  const destroyDiscord = async (): Promise<void> => {
    await client.destroy();
  };

  process.on("SIGTERM", () => {
    void ShutdownService.shutdown("SIGTERM", destroyDiscord);
  });

  process.on("SIGINT", () => {
    void ShutdownService.shutdown("SIGINT", destroyDiscord);
  });
}
