import { HoshikoLogger, LogLevel, PerformanceMonitor } from "../../Security";
import { connectWithRetry } from "../../Services/mongo";
import { createHoshikoClient } from "../../client/HoshikoClient";
import { AppConfig } from "../config/AppConfig";
import { HealthServer } from "./HealthServer";

export async function bootstrapBot(): Promise<{ client: ReturnType<typeof createHoshikoClient> }> {
  const config = AppConfig.get();
  const client = createHoshikoClient();

  if (!config.TOKEN) {
    throw new Error("TOKEN not found in environment");
  }

  const stats = PerformanceMonitor.getSystemStats();
  HoshikoLogger.log({
    level: LogLevel.INFO,
    context: "System/Performance",
    message: `Hoshiko starting on ${stats.platform}. RAM usage: ${stats.ramUsage}`,
  });

  await connectWithRetry();
  const healthServer = new HealthServer();
  healthServer.start();

  return { client };
}
