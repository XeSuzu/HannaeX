import Redis, { type RedisOptions } from "ioredis";
import { AppConfig } from "../../config/AppConfig";

export type RedisConnectionState =
  | "disabled"
  | "connecting"
  | "ready"
  | "degraded"
  | "closed";

export class RedisClientService {
  private static client: Redis | null = null;
  private static state: RedisConnectionState = "disabled";
  private static lastError: string | null = null;

  static isEnabled(): boolean {
    const env = AppConfig.get();
    return (
      env.REDIS_ENABLED === true &&
      typeof env.REDIS_URL === "string" &&
      env.REDIS_URL.trim().length > 0
    );
  }

  static getState(): RedisConnectionState {
    return this.state;
  }

  static async ensureClient(): Promise<Redis | null> {
    const env = AppConfig.get();

    if (!env.REDIS_ENABLED || !env.REDIS_URL) {
      this.client = null;
      this.state = "disabled";
      this.lastError = null;
      return null;
    }

    if (this.client && this.state === "ready") {
      return this.client;
    }

    this.state = "connecting";

    const redisOptions: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      keepAlive: 30000,
      commandTimeout: 3000,
    };

    const redis = new Redis(env.REDIS_URL, redisOptions);
    this.client = redis;

    redis.on("ready", () => {
      this.state = "ready";
      this.lastError = null;
    });

    redis.on("reconnecting", () => {
      this.state = "connecting";
    });

    redis.on("close", () => {
      if (this.state !== "closed") {
        this.state = this.isEnabled() ? "degraded" : "disabled";
      }
    });

    redis.on("error", (error: Error) => {
      this.state = "degraded";
      this.lastError = error.message;
      console.warn(
        "[Redis] Redis connection degraded; bot will continue without Redis.",
      );
    });

    try {
      await redis.connect();
      return redis;
    } catch (error) {
      this.state = "degraded";
      this.lastError =
        error instanceof Error ? error.message : "redis_connect_failed";
      console.warn(
        "[Redis] Redis is enabled but unavailable; continuing with degraded health.",
      );
      return redis;
    }
  }

  static async ping(): Promise<boolean> {
    const client = await this.ensureClient();
    if (!client || this.state !== "ready") {
      return false;
    }

    try {
      const reply = await client.ping();
      return reply === "PONG";
    } catch (error) {
      this.state = "degraded";
      const message =
        error instanceof Error ? error.message : "redis_ping_failed";
      this.lastError = message;
      return false;
    }
  }

  static getClient(): Redis | null {
    return this.client;
  }

  static getLastError(): string | null {
    return this.lastError;
  }

  static async close(): Promise<void> {
    if (!this.client) {
      this.state = this.isEnabled() ? "degraded" : "disabled";
      return;
    }

    this.state = "closed";
    const client = this.client;
    this.client = null;
    await client.quit().catch(() => undefined);
  }
}
