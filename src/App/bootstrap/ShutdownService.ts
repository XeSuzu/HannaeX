import { HoshikoLogger, LogLevel } from "../../Security";
import { disconnectMongo } from "../../Services/mongo";
import { RedisClientService } from "../infrastructure/redis/RedisClient";

export const SHUTDOWN_GRACE_TIMEOUT_MS = 15000;

export class ShutdownService {
  private static shutdownPromise: Promise<void> | null = null;
  private static graceTimer: NodeJS.Timeout | null = null;

  static async shutdown(
    signalName: string,
    destroyDiscord: () => Promise<void> | void,
    closeHealthServer: () => Promise<void> | void = () => undefined,
  ): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = (async () => {
      HoshikoLogger.log({
        level: LogLevel.WARN,
        context: "System/Shutdown",
        message: `Signal ${signalName} received. Marking process as not ready and shutting down gracefully.`,
      });

      const shutdownSteps = async (): Promise<void> => {
        try {
          await destroyDiscord();
        } catch (error) {
          console.error("[Shutdown] Discord destroy failed:", error);
        }

        try {
          await closeHealthServer();
        } catch (error) {
          console.error("[Shutdown] Health server close failed:", error);
        }

        try {
          await RedisClientService.close();
        } catch (error) {
          console.error("[Shutdown] Redis close failed:", error);
        }

        try {
          await disconnectMongo();
        } catch (error) {
          console.error("[Shutdown] Mongo disconnect failed:", error);
        }
      };

      try {
        await Promise.race([
          shutdownSteps(),
          new Promise<never>((_, reject) => {
            this.graceTimer = setTimeout(
              () => reject(new Error("shutdown_timeout")),
              SHUTDOWN_GRACE_TIMEOUT_MS,
            );
          }),
        ]);
      } catch (error: unknown) {
        console.error(
          "[Shutdown] Graceful shutdown timed out or failed:",
          error,
        );
      } finally {
        if (this.graceTimer) {
          clearTimeout(this.graceTimer);
          this.graceTimer = null;
        }
      }

      HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "System/Shutdown",
        message: "Shutdown sequence complete.",
      });
    })();

    return this.shutdownPromise;
  }
}
