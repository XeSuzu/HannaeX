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

  let mongoService: typeof import("./Services/mongo.js") | null = null;
  let redisClientService:
    | typeof import("./App/infrastructure/redis/RedisClient.js").RedisClientService
    | null = null;
  let workerBootstrap:
    | typeof import("./App/infrastructure/queue/WorkerBootstrap.js").WorkerBootstrap
    | null = null;
  let startupPromise: Promise<void> | null = null;
  let shutdownPromise: Promise<void> | null = null;
  let shutdownRequested = false;

  try {
    mongoService = await import("./Services/mongo.js");
    const redisModule = await import(
      "./App/infrastructure/redis/RedisClient.js"
    );
    redisClientService = redisModule.RedisClientService;
    const bootstrapModule = await import(
      "./App/infrastructure/queue/WorkerBootstrap.js"
    );
    workerBootstrap = bootstrapModule.WorkerBootstrap;
  } catch (error) {
    console.error("[Worker] infrastructure modules failed to load:", error);
    process.exitCode = 1;
    return;
  }

  const shutdown = (signal: string): Promise<void> => {
    shutdownRequested = true;
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      console.log(`[Worker] received ${signal}; shutting down`);
      await startupPromise?.catch(() => undefined);

      try {
        await workerBootstrap?.shutdown();
      } catch (error) {
        console.error("[Worker] queue shutdown failed:", error);
      }

      try {
        await redisClientService?.close();
      } catch (error) {
        console.error("[Worker] Redis close failed:", error);
      }

      try {
        await mongoService?.disconnectMongo();
      } catch (error) {
        console.error("[Worker] Mongo disconnect failed:", error);
      }
    })();

    return shutdownPromise;
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  if (!config.REDIS_ENABLED) {
    await workerBootstrap.initialize();
    process.exitCode = 1;
    await shutdown("worker-not-ready");
    return;
  }

  if (shutdownRequested) {
    await shutdown("startup-cancelled");
    return;
  }

  startupPromise = (async () => {
    await mongoService?.connectWithRetry();
    if (shutdownRequested) {
      return;
    }

    await redisClientService?.ensureClient();
    if (shutdownRequested) {
      return;
    }

    const workerStatus = await workerBootstrap?.initialize();
    if (!workerStatus?.ready) {
      console.warn(
        "[Worker] Redis is not ready; the worker will exit without starting queues.",
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `[Worker] status=${workerStatus.state}; queues active: ${workerStatus.queuesActive}`,
    );
  })();

  try {
    await startupPromise;
  } catch (error) {
    console.error("[Worker] startup failed:", error);
    process.exitCode = 1;
  }

  if (process.exitCode === 1) {
    await shutdown("worker-not-ready");
  }
}

void main();
