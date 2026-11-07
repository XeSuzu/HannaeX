import { RedisClientService } from "../../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../../App/infrastructure/redis/RedisKeys";
import { AiExemptionService } from "./AiExemptionService";
import {
  CYCLE_DURATION_MS,
  DualQuotaStatus,
  QUOTA_LIMITS,
  QuotaStatus,
  QuotaType,
} from "./QuotaTypes";
import {
  CONSUME_OR_REFRESH_LUA,
  GET_STATUS_LUA,
  ROLLBACK_LUA,
} from "./quotaLua";

interface LocalMemoryQuota {
  balance: number;
  consumed: number;
  cycleStart: number;
}

export class QuotaManager {
  private static readonly fallbackStore = new Map<string, LocalMemoryQuota>();
  private static timeOverrideFn: (() => number) | null = null;

  static setTimeOverride(fn: (() => number) | null): void {
    this.timeOverrideFn = fn;
  }

  private static getNow(): number {
    return this.timeOverrideFn ? this.timeOverrideFn() : Date.now();
  }

  private static getMemoryKey(userId: string, quotaType: QuotaType): string {
    return `${userId}:${quotaType}`;
  }

  private static evaluateMemoryQuota(
    userId: string,
    quotaType: QuotaType,
    consume: boolean = false,
  ): { allowed: boolean; balance: number; consumed: number; cycleStart: number } {
    const key = this.getMemoryKey(userId, quotaType);
    const maxCap = QUOTA_LIMITS[quotaType];
    const now = this.getNow();

    let entry = this.fallbackStore.get(key);
    if (!entry) {
      entry = {
        balance: maxCap,
        consumed: 0,
        cycleStart: now,
      };
      this.fallbackStore.set(key, entry);
    }

    // Comprobar si el ciclo de 24h ha vencido para reposición parcial exacta
    if (now - entry.cycleStart >= CYCLE_DURATION_MS) {
      entry.balance = Math.min(maxCap, entry.balance + entry.consumed);
      entry.consumed = 0;
      entry.cycleStart = now;
    }

    if (!consume) {
      return {
        allowed: entry.balance >= 1,
        balance: entry.balance,
        consumed: entry.consumed,
        cycleStart: entry.cycleStart,
      };
    }

    if (entry.balance >= 1) {
      entry.balance -= 1;
      entry.consumed += 1;
      return {
        allowed: true,
        balance: entry.balance,
        consumed: entry.consumed,
        cycleStart: entry.cycleStart,
      };
    }

    return {
      allowed: false,
      balance: entry.balance,
      consumed: entry.consumed,
      cycleStart: entry.cycleStart,
    };
  }

  private static rollbackMemoryQuota(userId: string, quotaType: QuotaType): void {
    const key = this.getMemoryKey(userId, quotaType);
    const maxCap = QUOTA_LIMITS[quotaType];
    const entry = this.fallbackStore.get(key);
    if (entry) {
      entry.balance = Math.min(maxCap, entry.balance + 1);
      entry.consumed = Math.max(0, entry.consumed - 1);
    }
  }

  static async getSingleStatus(
    userId: string,
    quotaType: QuotaType,
    guildId?: string | null,
  ): Promise<QuotaStatus> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    if (exemption.exempt) {
      const now = this.getNow();
      return {
        userId,
        quotaType,
        maxCapacity: Infinity,
        balance: Infinity,
        consumedInCycle: 0,
        cycleStartTime: now,
        nextRenewalTime: now + CYCLE_DURATION_MS,
        timeUntilRenewalMs: 0,
      };
    }

    const maxCap = QUOTA_LIMITS[quotaType];
    const now = this.getNow();

    if (!RedisClientService.isEnabled()) {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };
    }

    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (!redis || redis.status !== "ready") {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };
    }

    try {
      const redisKey = buildRedisKey("ai_quota", userId);
      const result = (await redis.eval(
        GET_STATUS_LUA,
        1,
        redisKey,
        quotaType,
        maxCap,
        now,
        CYCLE_DURATION_MS,
      )) as [number, number, number];

      const balance = Number(result[0]);
      const consumed = Number(result[1]);
      const cycleStart = Number(result[2]);
      const nextRenewalTime = cycleStart + CYCLE_DURATION_MS;

      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance,
        consumedInCycle: consumed,
        cycleStartTime: cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };
    } catch {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };
    }
  }

  static async getStatus(
    userId: string,
    guildId?: string | null,
  ): Promise<DualQuotaStatus> {
    const [conversation, research] = await Promise.all([
      this.getSingleStatus(userId, "conversation", guildId),
      this.getSingleStatus(userId, "research", guildId),
    ]);

    return {
      userId,
      conversation,
      research,
      bothExhausted: conversation.balance <= 0 && research.balance <= 0,
    };
  }

  static async reserveQuota(
    userId: string,
    quotaType: QuotaType,
    guildId?: string | null,
  ): Promise<{ allowed: boolean; status: QuotaStatus; reservationId: string }> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    if (exemption.exempt) {
      const now = this.getNow();
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: Infinity,
        balance: Infinity,
        consumedInCycle: 0,
        cycleStartTime: now,
        nextRenewalTime: now + CYCLE_DURATION_MS,
        timeUntilRenewalMs: 0,
      };
      return {
        allowed: true,
        status,
        reservationId: `res_exempt_${exemption.role}_${userId}_${Date.now()}`,
      };
    }

    const maxCap = QUOTA_LIMITS[quotaType];
    const now = this.getNow();
    const reservationId = `res_${userId}_${quotaType}_${Date.now()}`;

    if (!RedisClientService.isEnabled()) {
      const res = this.evaluateMemoryQuota(userId, quotaType, true);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };

      return {
        allowed: res.allowed,
        status,
        reservationId,
      };
    }

    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (!redis || redis.status !== "ready") {
      const res = this.evaluateMemoryQuota(userId, quotaType, true);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };

      return {
        allowed: res.allowed,
        status,
        reservationId,
      };
    }

    try {
      const redisKey = buildRedisKey("ai_quota", userId);
      const result = (await redis.eval(
        CONSUME_OR_REFRESH_LUA,
        1,
        redisKey,
        quotaType,
        maxCap,
        now,
        CYCLE_DURATION_MS,
      )) as [number, number, number, number];

      const allowed = Number(result[0]) === 1;
      const balance = Number(result[1]);
      const consumed = Number(result[2]);
      const cycleStart = Number(result[3]);
      const nextRenewalTime = cycleStart + CYCLE_DURATION_MS;

      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance,
        consumedInCycle: consumed,
        cycleStartTime: cycleStart,
        nextRenewalTime,
        timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
      };

      return {
        allowed,
        status,
        reservationId,
      };
    } catch {
      const res = this.evaluateMemoryQuota(userId, quotaType, true);
      const nextRenewalTime = res.cycleStart + CYCLE_DURATION_MS;
      return {
        allowed: res.allowed,
        status: {
          userId,
          quotaType,
          maxCapacity: maxCap,
          balance: res.balance,
          consumedInCycle: res.consumed,
          cycleStartTime: res.cycleStart,
          nextRenewalTime,
          timeUntilRenewalMs: Math.max(0, nextRenewalTime - now),
        },
        reservationId,
      };
    }
  }

  static async rollbackQuota(
    userId: string,
    quotaType: QuotaType,
    guildId?: string | null,
  ): Promise<void> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    if (exemption.exempt) {
      return;
    }

    const maxCap = QUOTA_LIMITS[quotaType];
    if (!RedisClientService.isEnabled()) {
      this.rollbackMemoryQuota(userId, quotaType);
      return;
    }

    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (!redis || redis.status !== "ready") {
      this.rollbackMemoryQuota(userId, quotaType);
      return;
    }

    try {
      const redisKey = buildRedisKey("ai_quota", userId);
      await redis.eval(ROLLBACK_LUA, 1, redisKey, quotaType, maxCap);
    } catch {
      this.rollbackMemoryQuota(userId, quotaType);
    }
  }

  static clearMemoryStore(): void {
    this.fallbackStore.clear();
  }
}
