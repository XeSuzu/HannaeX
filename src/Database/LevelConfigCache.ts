import { LRUCache } from "lru-cache";
import LevelConfig from "../Models/LevelConfig";

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 // 60 segundos
});

export class LevelConfigCache {
  static async getLite(guildId: string) {
    if (cache.has(guildId)) {
      return cache.get(guildId);
    }
    const config = await LevelConfig.findOne({ guildId }).lean();
    if (config) {
      cache.set(guildId, config);
    }
    return config;
  }

  static invalidate(guildId: string) {
    cache.delete(guildId);
  }
}
