import { LRUCache } from "lru-cache";
import LevelConfig from "./levelConfig.model";

const NULL_SENTINEL = Object.freeze({ enabled: false, _sentinel: true });

const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60, // 60 segundos
});

export class LevelConfigCache {
  static async get(guildId: string) {
    return this.getLite(guildId);
  }

  static async getLite(guildId: string) {
    if (cache.has(guildId)) {
      const cached = cache.get(guildId);
      return cached?._sentinel ? null : cached;
    }

    try {
      const config = await LevelConfig.findOne({ guildId }).lean();
      if (config) {
        cache.set(guildId, config);
        return config;
      }
      cache.set(guildId, NULL_SENTINEL);
      return null;
    } catch {
      return null;
    }
  }

  static invalidate(guildId: string) {
    cache.delete(guildId);
  }

  static clear() {
    cache.clear();
  }
}
