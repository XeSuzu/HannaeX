import { RedisClientService } from "./RedisClient";

export class RedisHealthService {
  static getStatus(): {
    state: "disabled" | "connecting" | "ready" | "degraded" | "closed";
    enabled: boolean;
    ready: boolean;
    lastError: string | null;
  } {
    const state = RedisClientService.getState();

    return {
      state,
      enabled: RedisClientService.isEnabled(),
      ready: state === "ready",
      lastError: RedisClientService.getLastError(),
    };
  }
}
