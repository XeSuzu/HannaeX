const windows = new Map<string, { count: number; windowStart: number }>();
const DEFAULT_WINDOW_MS = 5000; // 5s
const DEFAULT_LIMIT = 5; // 5 mensajes por ventana

export class RateLimiter {
  static isSpamming(
    userId: string,
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  ): boolean {
    const now = Date.now();
    const rec = windows.get(userId);
    if (!rec) {
      windows.set(userId, { count: 1, windowStart: now });
      return false;
    }
    if (now - rec.windowStart > windowMs) {
      windows.set(userId, { count: 1, windowStart: now });
      return false;
    }
    rec.count += 1;
    windows.set(userId, rec);
    return rec.count > limit;
  }

  static reset(userId: string) {
    windows.delete(userId);
  }
}
