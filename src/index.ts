import { HoshikoLogger, LogLevel, PerformanceMonitor } from "./Security";
import { connectWithRetry } from "./Services/mongo";
import { loadAntiCrash } from "./Utils/antiCrash";
import { startCronJobs } from "./scripts/cronJobs";
import { loadHandlers } from "./bootstrap/loadHandlers";
import { createHoshikoClient, HoshikoClient } from "./client/HoshikoClient";
import { loadEnvironment } from "./config/loadEnvironment";
import { createHealthServer } from "./http/healthServer";
import { installShutdownHandlers } from "./lifecycle/shutdown";

loadEnvironment();
loadAntiCrash();

const startHealthServer = createHealthServer();
const client = createHoshikoClient();

async function start(): Promise<void> {
  try {
    if (!client.config.token) {
      throw new Error("TOKEN not found in .env file");
    }

    const stats = PerformanceMonitor.getSystemStats();
    HoshikoLogger.log({
      level: LogLevel.INFO,
      context: "System/Performance",
      message: `Hoshiko starting on ${stats.platform}. RAM usage: ${stats.ramUsage}`,
    });

    await connectWithRetry();
    loadHandlers(client);
    startHealthServer();
    await client.login(client.config.token);
    startCronJobs(client);
  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    HoshikoLogger.log({
      level: LogLevel.FATAL,
      context: "System/Startup",
      message: "Critical error during startup",
      metadata: err,
    });
    process.exit(1);
  }
}

void start();
installShutdownHandlers(client);

export { HoshikoClient };
export default client;
