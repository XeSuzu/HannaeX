import { AppConfig } from "../../config/AppConfig";
import { RedisClientService } from "../redis/RedisClient";
import { QueueRegistry } from "./QueueRegistry";
import { QueueService } from "./QueueService";

export class WorkerBootstrap {
  static async initialize(): Promise<{
    enabled: boolean;
    ready: boolean;
    queuesActive: number;
    state: "disabled" | "ready" | "idle" | "not-ready";
  }> {
    const env = AppConfig.get();

    if (!env.WORKER_ENABLED) {
      return {
        enabled: false,
        ready: false,
        queuesActive: 0,
        state: "disabled",
      };
    }

    if (!env.REDIS_ENABLED) {
      console.warn(
        "[Worker] Worker requires Redis; enable REDIS_ENABLED before starting it.",
      );
      return {
        enabled: true,
        ready: false,
        queuesActive: 0,
        state: "not-ready",
      };
    }

    await QueueService.initialize();

    if (RedisClientService.getState() !== "ready") {
      console.warn(
        "[Worker] Redis is unavailable; no queues or workers were initialized.",
      );
      return {
        enabled: true,
        ready: false,
        queuesActive: 0,
        state: "not-ready",
      };
    }

    const queuesActive = QueueRegistry.getActiveQueueCount();
    const state = queuesActive === 0 ? "idle" : "ready";

    console.log(`[Worker] ready; queues active: ${queuesActive}`);

    return {
      enabled: true,
      ready: true,
      queuesActive,
      state,
    };
  }

  static async shutdown(): Promise<void> {
    // Reserved for later queue workers. No business queues are active in this phase.
  }
}
