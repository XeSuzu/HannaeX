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

  static registerQueue<TPayload>(queueName: string, _job: QueueJob<TPayload>): void {
    QueueRegistry.markActive(queueName);
  }

  private static batchers = new Map<
    string,
    {
      maxSize: number;
      windowMs: number;
      handler: (groupKey: string, items: any[]) => Promise<void>;
      groups: Map<string, { items: any[]; timer: NodeJS.Timeout }>;
    }
  >();

  /**
   * Registra una cola de procesamiento en lotes (Batching, Pilar 6)
   * que agrupa hasta `maxSize` elementos o espera `windowMs` antes de disparar una sola petición.
   */
  static registerBatcher<TItem>(
    queueName: string,
    options: { maxSize: number; windowMs: number },
    handler: (groupKey: string, items: TItem[]) => Promise<void>,
  ): void {
    QueueRegistry.markActive(queueName);
    this.batchers.set(queueName, {
      maxSize: options.maxSize,
      windowMs: options.windowMs,
      handler,
      groups: new Map(),
    });
  }

  static enqueueBatchItem<TItem>(
    queueName: string,
    groupKey: string,
    item: TItem,
  ): void {
    const batcher = this.batchers.get(queueName);
    if (!batcher) return;

    const existing = batcher.groups.get(groupKey);
    if (existing) {
      existing.items.push(item);
      if (existing.items.length >= batcher.maxSize) {
        clearTimeout(existing.timer);
        this.flushBatchGroup(queueName, groupKey);
      }
      return;
    }

    const timer = setTimeout(() => {
      this.flushBatchGroup(queueName, groupKey);
    }, batcher.windowMs);
    timer.unref?.();

    batcher.groups.set(groupKey, { items: [item], timer });
  }

  private static flushBatchGroup(queueName: string, groupKey: string): void {
    const batcher = this.batchers.get(queueName);
    if (!batcher) return;
    const group = batcher.groups.get(groupKey);
    if (!group) return;
    batcher.groups.delete(groupKey);

    void batcher.handler(groupKey, group.items).catch((err) => {
      console.error(`[QueueService:${queueName}] Error en lote (${groupKey}):`, err);
    });
  }
}
