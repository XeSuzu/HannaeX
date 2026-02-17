// src/Security/Defense/RateLImiter.ts

const userCooldowns = new Map<string, number[]>();

export class RateLimiter {
  private static LIMIT = 5;
  private static WINDOW = 10000;

  // 🌸 ¡Asegúrate de que diga 'static'!
  static isSpamming(userId: string): boolean {
    const now = Date.now();
    const timestamps = userCooldowns.get(userId) || [];

    const recentTimestamps = timestamps.filter((ts) => now - ts < this.WINDOW);

    if (recentTimestamps.length >= this.LIMIT) {
      return true;
    }

    recentTimestamps.push(now);
    userCooldowns.set(userId, recentTimestamps);
    return false;
  }
}
