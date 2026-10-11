import { AppConfig } from "./App/config/AppConfig";

async function main(): Promise<void> {
  const config = AppConfig.load();

  if (!config.WORKER_ENABLED) {
    console.log(
      "[Worker] Worker disabled by configuration; no infrastructure connections were started.",
    );
    process.exitCode = 0;
    return;
  }

  let mongoService: typeof import("./Services/mongo.js") | undefined;
  let redisClientService:
    | typeof import("./App/infrastructure/redis/RedisClient.js").RedisClientService
    | undefined;

  try {
    const mongo = await import("./Services/mongo.js");
    mongoService = mongo;
    const redisModule =
      await import("./App/infrastructure/redis/RedisClient.js");
    redisClientService = redisModule.RedisClientService;
    const { WorkerBootstrap } =
      await import("./App/infrastructure/queue/WorkerBootstrap.js");

    await mongo.connectWithRetry();
    if (config.REDIS_ENABLED) {
      await redisModule.RedisClientService.ensureClient();
    }

    const workerStatus = await WorkerBootstrap.initialize();
    console.log(
      `[Worker] status=${workerStatus.state}; queues active: ${workerStatus.queuesActive}`,
    );

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`[Worker] received ${signal}; shutting down`);
      await WorkerBootstrap.shutdown();
      await redisModule.RedisClientService.close();
      await mongo.disconnectMongo();
      process.exit(0);
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("[Worker] startup failed:", error);
    await redisClientService?.close().catch(() => undefined);
    await mongoService?.disconnectMongo().catch(() => undefined);
    process.exit(1);
  }
}

void main();
