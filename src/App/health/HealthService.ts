import { getMongoStatus } from "../../Services/mongo";
import { AppConfig } from "../config/AppConfig";
import { QueueRegistry } from "../infrastructure/queue/QueueRegistry";
import { QueueService } from "../infrastructure/queue/QueueService";
import { RedisHealthService } from "../infrastructure/redis/RedisHealthService";

export type HealthProceedState = "live" | "ready" | "degraded" | "not-ready";

export interface HealthSnapshot {
  status: HealthProceedState;
  environment: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  eventLoopDelayMs: number;
  mongo: {
    status: "connected" | "connecting" | "disconnected" | "degraded" | "closed";
  };
  redis: {
    state: "disabled" | "connecting" | "ready" | "degraded" | "closed";
    enabled: boolean;
    ready: boolean;
    lastError: string | null;
  };
  worker: {
    availability: "disabled" | "optional-ready" | "idle" | "degraded";
    queuesActive: number;
  };
}

export class HealthService {
  static getLive(): { status: "ok" } {
    return { status: "ok" };
  }

  static getReadyState(
    mongoStatus: string,
    discordReady: boolean,
  ): { status: "ok" | "degraded"; details: string } {
    const env = AppConfig.get();
    const criticalOk =
      env.TOKEN !== undefined &&
      env.TOKEN.length > 0 &&
      env.MONGO_URI !== undefined &&
      env.MONGO_URI.length > 0;

    if (!criticalOk || mongoStatus !== "connected" || !discordReady) {
      return {
        status: "degraded",
        details: "bot-not-ready",
      };
    }

    return {
      status: "ok",
      details: "ready",
    };
  }

  static getDetails(discordReady: boolean): HealthSnapshot {
    const memory = process.memoryUsage();
    const env = AppConfig.get();
    const redisStatus = RedisHealthService.getStatus();
    const queueStatus = QueueService.getAvailability();
    const mongoStatus = getMongoStatus();
    const readiness = this.getReadyState(mongoStatus, discordReady);

    return {
      status: readiness.status === "ok" ? "ready" : "degraded",
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers,
      },
      eventLoopDelayMs: 0,
      mongo: {
        status: mongoStatus,
      },
      redis: {
        state: redisStatus.state,
        enabled: redisStatus.enabled,
        ready: redisStatus.ready,
        lastError: redisStatus.lastError,
      },
      worker: {
        availability: env.WORKER_ENABLED ? queueStatus : "disabled",
        queuesActive: QueueRegistry.getActiveQueueCount(),
      },
    };
  }

  static getEventLoopDelayMs(): number {
    const start = Date.now();
    let last = start;
    const interval = setInterval(() => {
      const now = Date.now();
      last = now;
    }, 1000);

    if (interval) {
      clearInterval(interval);
    }

    return Date.now() - start;
  }
}
