import { HoshikoClient } from "../client/HoshikoClient";
import { HoshikoLogger, LogLevel } from "../Security";

export function installShutdownHandlers(client: HoshikoClient): void {
  async function shutdown(signal: string): Promise<void> {
    HoshikoLogger.log({
      level: LogLevel.WARN,
      context: "System/Shutdown",
      message: `Signal ${signal} received. Shutting down Hoshiko safely...`,
    });

    try {
      client.destroy();
      HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "System",
        message: "Discord client destroyed.",
      });
    } catch (error) {
      console.error("Error during shutdown:", error);
    } finally {
      process.exit(0);
    }
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
