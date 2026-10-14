import Redis, { type RedisOptions } from "ioredis";
import { AppConfig } from "../../config/AppConfig";

export type RedisConnectionState =
  | "disabled"
  | "connecting"
  | "ready"
  | "degraded"
  | "closed";

export class RedisClientService {
  private static readonly connectWaitMs = 3000;
  private static readonly quitWaitMs = 2000;
  private static client: Redis | null = null;
  private static connectionPromise: Promise<Redis | null> | null = null;
  private static closePromise: Promise<void> | null = null;
  private static state: RedisConnectionState = "disabled";
  private static lastError: string | null = null;

  static isEnabled(): boolean {
    return AppConfig.get().REDIS_ENABLED;
  }

  static getState(): RedisConnectionState {
    if (!this.isEnabled() && this.client) {
      void this.close().catch(() => undefined);
      return "disabled";
    }

    return this.state;
  }

  static async ensureClient(): Promise<Redis | null> {
    const env = AppConfig.get();

    if (!env.REDIS_ENABLED) {
      await this.close();
      this.state = "disabled";
      this.lastError = null;
      return null;
    }

    if (!env.REDIS_URL) {
      await this.close();
      this.state = "degraded";
      this.lastError = "redis_url_missing";
      console.warn("[Redis] REDIS_ENABLED is true but REDIS_URL is missing.");
      return null;
    }

    if (this.client && this.isTerminal(this.client)) {
      await this.close();
    }

    if (this.client) {
      if (this.client.status === "ready") {
        this.state = "ready";
        return this.client;
      }

      if (this.connectionPromise) {
        return this.connectionPromise;
      }

      this.state =
        this.client.status === "connecting" ||
        this.client.status === "connect" ||
        this.client.status === "reconnecting"
          ? "connecting"
          : "degraded";
      return this.client;
    }

    const redisOptions: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      keepAlive: 30000,
      commandTimeout: 3000,
      retryStrategy: (attempt: number) => Math.min(attempt * 250, 3000),
    };

    let redis: Redis;
    try {
      redis = new Redis(env.REDIS_URL, redisOptions);
    } catch (error) {
      this.state = "degraded";
      const code =
        error instanceof Error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
      this.lastError = code ?? "redis_client_creation_failed";
      console.warn(
        "[Redis] Redis client could not be created; bot startup will continue without Redis.",
      );
      return null;
    }
    this.client = redis;
    this.state = "connecting";

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

    redis.on("end", () => {
      if (this.state !== "closed") {
        this.state = this.isEnabled() ? "degraded" : "disabled";
      }
    });

    redis.on("error", (error: Error) => {
      if (this.state !== "closed") {
        this.state = "degraded";
      }
      const code = (error as NodeJS.ErrnoException).code;
      this.lastError = code ?? "redis_connection_failed";
      console.warn(
        "[Redis] Redis connection degraded; bot will continue without Redis.",
      );
    });

    const connectionPromise = (async (): Promise<Redis | null> => {
      let timeout: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          redis.connect(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("redis_connect_timeout")),
              this.connectWaitMs,
            );
          }),
        ]);
        this.state = redis.status === "ready" ? "ready" : "degraded";
        return redis;
      } catch (error) {
        if (this.state !== "closed") {
          this.state = "degraded";
        }
        const code =
          error instanceof Error
            ? (error as NodeJS.ErrnoException).code
            : undefined;
        this.lastError = code ?? "redis_connection_failed";
        console.warn(
          "[Redis] Redis is unavailable; bot startup will continue without Redis.",
        );
        return redis;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (this.client === redis) {
          this.connectionPromise = null;
        }
      }
    })();
    this.connectionPromise = connectionPromise;
    return connectionPromise;
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
      const code =
        error instanceof Error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
      this.lastError = code ?? "redis_ping_failed";
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
    if (this.closePromise) {
      return this.closePromise;
    }

    if (!this.client) {
      if (!this.isEnabled()) {
        this.state = "disabled";
        this.lastError = null;
      }
      return;
    }

    const client = this.client;
    this.state = "closed";

    const closePromise = (async (): Promise<void> => {
      let timeout: NodeJS.Timeout | undefined;
      try {
        if (client.status === "ready" || client.status === "connect") {
          await Promise.race([
            client.quit(),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("redis_quit_timeout")),
                this.quitWaitMs,
              );
            }),
          ]);
        } else {
          client.disconnect();
        }
      } catch {
        client.disconnect();
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
        client.removeAllListeners();
        if (this.client === client) {
          this.client = null;
        }
        this.connectionPromise = null;
        this.state = this.isEnabled() ? "closed" : "disabled";
        if (!this.isEnabled()) {
          this.lastError = null;
        }
      }
    })();
    this.closePromise = closePromise;

    try {
      await closePromise;
    } finally {
      if (this.closePromise === closePromise) {
        this.closePromise = null;
      }
    }
  }

  private static isTerminal(client: Redis): boolean {
    return client.status === "end";
  }
}
