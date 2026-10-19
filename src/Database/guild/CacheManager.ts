import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { RedisClientService } from "../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../App/infrastructure/redis/RedisKeys";
import ServerConfig, { IServerConfig } from "./serverConfig.model";

const REDIS_TTL_SECONDS = 600; // 10 minutos en Redis L2

export class CacheManager {
  // L1: Caché LRU en memoria acotada (máximo 1000 servidores, TTL 5 min)
  private static l1Cache = new LocalCacheService<IServerConfig>(
    "guild_settings_l1",
    {
      max: 1000,
      ttlMs: 1000 * 60 * 5,
    },
  );
  private static inFlight = new Map<string, Promise<IServerConfig>>();

  private static getRedisKey(guildId: string): string {
    return buildRedisKey("guild_cfg", guildId);
  }

  /**
   * Devuelve la configuración del servidor usando cascada L1 -> L2 (Redis) -> MongoDB.
   */
  static async get(guildId: string): Promise<IServerConfig> {
    // 1. Consulta L1 (RAM)
    const cachedL1 = this.l1Cache.get(guildId);
    if (cachedL1) return cachedL1;

    // 2. Deduplicar peticiones simultáneas para el mismo guildId
    const existingPromise = this.inFlight.get(guildId);
    if (existingPromise) return existingPromise;

    const fetchPromise = (async () => {
      try {
        // 3. Consulta L2 (Redis) si está listo
        if (RedisClientService.getState() === "ready") {
          const redis = RedisClientService.getClient();
          if (redis) {
            try {
              const raw = await redis.get(this.getRedisKey(guildId));
              if (raw) {
                const parsed = JSON.parse(raw) as IServerConfig;
                this.l1Cache.set(guildId, parsed);
                return parsed;
              }
            } catch {
              // Fallback silencioso a MongoDB si falla Redis o JSON
            }
          }
        }

        // 4. Consulta MongoDB y puebla L2 + L1
        const config = await ServerConfig.findOneAndUpdate(
          { guildId },
          { $setOnInsert: { guildId } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        const plainObj =
          typeof (config as any).toObject === "function"
            ? (config.toObject() as IServerConfig)
            : config;

        this.l1Cache.set(guildId, config);

        if (RedisClientService.getState() === "ready") {
          const redis = RedisClientService.getClient();
          if (redis) {
            void redis
              .set(
                this.getRedisKey(guildId),
                JSON.stringify(plainObj),
                "EX",
                REDIS_TTL_SECONDS,
              )
              .catch(() => undefined);
          }
        }

        return config;
      } finally {
        this.inFlight.delete(guildId);
      }
    })();

    this.inFlight.set(guildId, fetchPromise);
    return fetchPromise;
  }

  /**
   * Escribe la configuración en MongoDB y sincroniza L1 y L2 (Redis).
   */
  static async update(
    guildId: string,
    updateData: any,
  ): Promise<IServerConfig | null> {
    const newConfig = await ServerConfig.findOneAndUpdate(
      { guildId },
      { $set: updateData },
      { new: true, upsert: true },
    );

    if (newConfig) {
      this.l1Cache.set(guildId, newConfig);

      if (RedisClientService.getState() === "ready") {
        const redis = RedisClientService.getClient();
        if (redis) {
          const plainObj =
            typeof (newConfig as any).toObject === "function"
              ? newConfig.toObject()
              : newConfig;
          void redis
            .set(
              this.getRedisKey(guildId),
              JSON.stringify(plainObj),
              "EX",
              REDIS_TTL_SECONDS,
            )
            .catch(() => undefined);
        }
      }
    }

    return newConfig;
  }

  /**
   * Elimina la entrada de L1 y L2 para forzar una recarga desde DB.
   */
  static flush(guildId: string) {
    this.l1Cache.delete(guildId);
    if (RedisClientService.getState() === "ready") {
      const redis = RedisClientService.getClient();
      if (redis) {
        void redis.del(this.getRedisKey(guildId)).catch(() => undefined);
      }
    }
  }
}

