import { AppConfig } from "./App/config/AppConfig";
import { RedisClientService } from "./App/infrastructure/redis/RedisClient";
import { HoshikoLogger, LogLevel, PerformanceMonitor } from "./Security";
import { connectWithRetry } from "./Services/mongo";
import { loadAntiCrash } from "./Utils/antiCrash";
import { loadHandlers } from "./bootstrap/loadHandlers";
import { createHoshikoClient, HoshikoClient } from "./client/HoshikoClient";
import { createHealthServer } from "./http/healthServer";
import { installShutdownHandlers } from "./lifecycle/shutdown";
import { startCronJobs } from "./scripts/cronJobs";

AppConfig.load();
loadAntiCrash();

const client = createHoshikoClient();
const healthServer = createHealthServer(() => client.isReady());

async function start(): Promise<void> {
  try {
    if (!client.config.token) {
      throw new Error("TOKEN not found in environment");
    }

    const stats = PerformanceMonitor.getSystemStats();
    HoshikoLogger.log({
      level: LogLevel.INFO,
      context: "System/Performance",
      message: `Hoshiko starting on ${stats.platform}. RAM usage: ${stats.ramUsage}`,
    });

    await connectWithRetry();
    if (AppConfig.get().REDIS_ENABLED) {
      void RedisClientService.ensureClient().catch(() => {
        console.warn(
          "[Redis] Optional initialization failed; the bot will continue without Redis.",
        );
      });
    }
    await loadHandlers(client);
    healthServer.start();
    await client.login(client.config.token);
    startCronJobs(client);
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    HoshikoLogger.log({
      level: LogLevel.FATAL,
      context: "System/Startup",
      message: "Critical error during startup",
      metadata: error,
    });
    process.exit(1);
  }
}

void start();
installShutdownHandlers(client, () => healthServer.close());

export { HoshikoClient };
export default client;
