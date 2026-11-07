import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitCache = new LocalCacheService<RateLimitEntry>("rate_limiter", {
  max: 10_000,
  ttlMs: 30_000,
});

const DEFAULT_WINDOW_MS = 5000; // 5s
const DEFAULT_LIMIT = 5; // 5 mensajes por ventana

export class RateLimiter {
  static isSpamming(
    userId: string,
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  ): boolean {
    const now = Date.now();
    const rec = rateLimitCache.get(userId);
    if (!rec || now - rec.windowStart > windowMs) {
      rateLimitCache.set(userId, { count: 1, windowStart: now });
      return false;
    }
    rec.count += 1;
    rateLimitCache.set(userId, rec);
    return rec.count > limit;
  }

  static reset(userId: string) {
    rateLimitCache.delete(userId);
  }
}
