import { LRUCache } from "lru-cache";

export interface LocalCacheStats {
  cacheName: string;
  size: number;
  max: number;
  ttlMs: number;
  hits: number;
  misses: number;
}

export class LocalCacheService<T extends object> {
  private readonly cache: LRUCache<string, T>;
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly cacheName: string;
  private hits = 0;
  private misses = 0;

  constructor(
    cacheName: string,
    options: { max: number; ttlMs: number; updateAgeOnGet?: boolean },
  ) {
    if (!Number.isInteger(options.max) || options.max <= 0) {
      throw new Error(
        "LocalCacheService requires max to be a positive integer",
      );
    }

    if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0) {
      throw new Error(
        "LocalCacheService requires ttlMs to be a positive number",
      );
    }

    this.cacheName = cacheName;
    this.maxEntries = options.max;
    this.ttlMs = options.ttlMs;
    this.cache = new LRUCache<string, T>({
      max: options.max,
      ttl: options.ttlMs,
      updateAgeOnGet: options.updateAgeOnGet ?? true,
    });
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value === undefined) {
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): LocalCacheStats {
    return {
      cacheName: this.cacheName,
      size: this.cache.size,
      max: this.maxEntries,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
    };
  }
}
