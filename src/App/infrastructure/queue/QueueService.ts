import { AppConfig } from "../../config/AppConfig";
import { RedisClientService } from "../redis/RedisClient";
import { QueueRegistry } from "./QueueRegistry";
import type { QueueAvailability, QueueJob } from "./QueueTypes";

export class QueueService {
  static async initialize(): Promise<void> {
    const env = AppConfig.get();
    if (!env.REDIS_ENABLED) {
      return;
    }

    if (RedisClientService.getState() !== "ready") {
      await RedisClientService.ensureClient();
    }
  }

  static getAvailability(): QueueAvailability {
    const env = AppConfig.get();

    if (!env.REDIS_ENABLED) {
      return "disabled";
    }

    if (RedisClientService.getState() !== "ready") {
      return "degraded";
    }

    return QueueRegistry.getActiveQueueCount() === 0 ? "idle" : "optional-ready";
  }

  static registerQueue<TPayload>(_queueName: string, _job: QueueJob<TPayload>): void {
    // This phase intentionally keeps queue registration empty.
    // Future features may add real queue bindings here without migrating current business logic.
  }
}
