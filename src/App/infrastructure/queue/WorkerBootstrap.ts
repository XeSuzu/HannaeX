import { AppConfig } from "../../config/AppConfig";
import { QueueRegistry } from "./QueueRegistry";
import { QueueService } from "./QueueService";

export class WorkerBootstrap {
  static async initialize(): Promise<{ enabled: boolean; ready: boolean; queuesActive: number; state: "disabled" | "ready" | "idle" }> {
    const env = AppConfig.get();

    if (!env.WORKER_ENABLED) {
      return {
        enabled: false,
        ready: false,
        queuesActive: 0,
        state: "disabled",
      };
    }

    await QueueService.initialize();

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
