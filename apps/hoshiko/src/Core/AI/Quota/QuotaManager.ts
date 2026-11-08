import { EmbedBuilder } from "discord.js";
import { RedisClientService } from "../../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../../App/infrastructure/redis/RedisKeys";
import { AiExemptionService, type ExemptionRole } from "./AiExemptionService";
import {
  DualQuotaStatus,
  QUOTA_LIMITS,
  QuotaStatus,
  QuotaType,
  getEcuadorCycleInfo,
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
  private static readonly memoryExhaustionNotices = new Set<string>();
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
    const cycle = getEcuadorCycleInfo(now);

    let entry = this.fallbackStore.get(key);
    if (!entry) {
      entry = {
        balance: maxCap,
        consumed: 0,
        cycleStart: cycle.cycleStart,
      };
      this.fallbackStore.set(key, entry);
    }

    // Reinicio diario estricto a las 00:00 de Ecuador (America/Guayaquil)
    if (entry.cycleStart < cycle.cycleStart) {
      entry.balance = maxCap;
      entry.consumed = 0;
      entry.cycleStart = cycle.cycleStart;
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
    const now = this.getNow();
    const cycle = getEcuadorCycleInfo(now);

    if (exemption.exempt) {
      return {
        userId,
        quotaType,
        maxCapacity: Infinity,
        balance: Infinity,
        consumedInCycle: 0,
        cycleStartTime: cycle.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: true,
      };
    }

    const maxCap = QUOTA_LIMITS[quotaType];

    if (!RedisClientService.isEnabled()) {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
      };
    }

    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (!redis || redis.status !== "ready") {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
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
        cycle.cycleStart,
      )) as [number, number, number];

      const balance = Number(result[0]);
      const consumed = Number(result[1]);
      const cycleStart = Number(result[2]);

      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance,
        consumedInCycle: consumed,
        cycleStartTime: cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
      };
    } catch {
      const res = this.evaluateMemoryQuota(userId, quotaType, false);
      return {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
      };
    }
  }

  static async getStatus(
    userId: string,
    guildId?: string | null,
  ): Promise<DualQuotaStatus> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    const [conversation, research] = await Promise.all([
      this.getSingleStatus(userId, "conversation", guildId),
      this.getSingleStatus(userId, "research", guildId),
    ]);

    const bothExhausted = !exemption.exempt && conversation.balance <= 0 && research.balance <= 0;

    return {
      userId,
      conversation,
      research,
      bothExhausted,
      isExempt: exemption.exempt,
      exemptionRole: exemption.role,
    };
  }

  static async reserveQuota(
    userId: string,
    quotaType: QuotaType,
    guildId?: string | null,
  ): Promise<{ allowed: boolean; status: QuotaStatus; reservationId: string }> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    const now = this.getNow();
    const cycle = getEcuadorCycleInfo(now);

    if (exemption.exempt) {
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: Infinity,
        balance: Infinity,
        consumedInCycle: 0,
        cycleStartTime: cycle.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: true,
      };
      return {
        allowed: true,
        status,
        reservationId: `res_exempt_${exemption.role}_${userId}_${Date.now()}`,
      };
    }

    const maxCap = QUOTA_LIMITS[quotaType];
    const reservationId = `res_${userId}_${quotaType}_${Date.now()}`;

    if (!RedisClientService.isEnabled()) {
      const res = this.evaluateMemoryQuota(userId, quotaType, true);
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
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
      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance: res.balance,
        consumedInCycle: res.consumed,
        cycleStartTime: res.cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
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
        cycle.cycleStart,
      )) as [number, number, number, number];

      const allowed = Number(result[0]) === 1;
      const balance = Number(result[1]);
      const consumed = Number(result[2]);
      const cycleStart = Number(result[3]);

      const status: QuotaStatus = {
        userId,
        quotaType,
        maxCapacity: maxCap,
        balance,
        consumedInCycle: consumed,
        cycleStartTime: cycleStart,
        nextRenewalTime: cycle.nextRenewalTime,
        timeUntilRenewalMs: cycle.timeUntilRenewalMs,
        isExempt: false,
      };

      return {
        allowed,
        status,
        reservationId,
      };
    } catch {
      const res = this.evaluateMemoryQuota(userId, quotaType, true);
      return {
        allowed: res.allowed,
        status: {
          userId,
          quotaType,
          maxCapacity: maxCap,
          balance: res.balance,
          consumedInCycle: res.consumed,
          cycleStartTime: res.cycleStart,
          nextRenewalTime: cycle.nextRenewalTime,
          timeUntilRenewalMs: cycle.timeUntilRenewalMs,
          isExempt: false,
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

  /**
   * Comprueba si el usuario ya recibió el aviso de agotamiento para el ciclo actual.
   * Regla de diseño: Exactamente una vez por usuario y ciclo diario (00:00 Ecuador).
   */
  static async hasExhaustionNoticeBeenSent(
    userId: string,
    guildId?: string | null,
  ): Promise<boolean> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    if (exemption.exempt) return true; // No mostrar a usuarios inmunes

    const now = this.getNow();
    const cycle = getEcuadorCycleInfo(now);
    const noticeKey = `${userId}:${cycle.cycleStart}`;

    if (!RedisClientService.isEnabled()) {
      return this.memoryExhaustionNotices.has(noticeKey);
    }

    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (!redis || redis.status !== "ready") {
      return this.memoryExhaustionNotices.has(noticeKey);
    }

    try {
      const redisNoticeKey = buildRedisKey("ai_exhaust_notice", noticeKey);
      const val = await redis.get(redisNoticeKey);
      return val !== null;
    } catch {
      return this.memoryExhaustionNotices.has(noticeKey);
    }
  }

  static async markExhaustionNoticeSent(
    userId: string,
    guildId?: string | null,
  ): Promise<void> {
    const exemption = await AiExemptionService.hasQuotaExemption(userId, guildId);
    if (exemption.exempt) return;

    const now = this.getNow();
    const cycle = getEcuadorCycleInfo(now);
    const noticeKey = `${userId}:${cycle.cycleStart}`;

    this.memoryExhaustionNotices.add(noticeKey);

    if (RedisClientService.isEnabled()) {
      const redis = await RedisClientService.ensureClient().catch(() => null);
      if (redis && redis.status === "ready") {
        try {
          const redisNoticeKey = buildRedisKey("ai_exhaust_notice", noticeKey);
          const ttlSec = Math.max(60, Math.ceil(cycle.timeUntilRenewalMs / 1000) + 3600);
          await redis.set(redisNoticeKey, "1", "EX", ttlSec);
        } catch {}
      }
    }
  }

  /**
   * Genera el embed unificado de cuotas e información Premium.
   * Este mismo embed sirve como respuesta a /ai usage y como mensaje automático de agotamiento.
   */
  static createUsageEmbed(
    userId: string,
    username: string,
    status: DualQuotaStatus,
    guildId?: string | null,
    isExhaustionNotice: boolean = false,
  ): EmbedBuilder {
    const hoursRem = Math.floor(status.conversation.timeUntilRenewalMs / (1000 * 60 * 60));
    const minsRem = Math.floor((status.conversation.timeUntilRenewalMs % (1000 * 60 * 60)) / (1000 * 60));

    const isExempt = status.isExempt === true || status.conversation.maxCapacity === Infinity;
    const role = status.exemptionRole || "none";

    let timeText = "";
    if (isExempt) {
      if (role === "owner") {
        timeText = "Inmunidad total activa (Sin restricciones internas de consumo)";
      } else if (role === "test_guild") {
        timeText = "Servidor de pruebas exento de cuotas internas Free";
      } else {
        timeText = "Exención activa (Sin límites de cuota)";
      }
    } else {
      timeText = `${hoursRem}h ${minsRem}m (a las 00:00 hora Ecuador)`;
    }

    let convVal = "";
    let resVal = "";

    if (isExempt) {
      const reasonTag =
        role === "owner"
          ? "Exento por Propietario"
          : role === "test_guild"
            ? "Servidor de Pruebas"
            : "Exención activa";
      convVal = `• **Saldo disponible:** \`∞ Ilimitado\` *(${reasonTag})*\n• **Consumido en el ciclo:** \`0\``;
      resVal = `• **Saldo disponible:** \`∞ Ilimitado\` *(${reasonTag})*\n• **Consumido en el ciclo:** \`0\``;
    } else {
      convVal = `• **Saldo disponible:** \`${status.conversation.balance} / ${status.conversation.maxCapacity}\`\n• **Consumido en el ciclo:** \`${status.conversation.consumedInCycle}\``;
      resVal = `• **Saldo disponible:** \`${status.research.balance} / ${status.research.maxCapacity}\`\n• **Consumido en el ciclo:** \`${status.research.consumedInCycle}\``;
    }

    let premiumVal = "";
    if (isExempt) {
      if (role === "owner") {
        premiumVal = "• **Estado:** `Inmune` *(Propietario del bot • Sin restricciones)*";
      } else if (role === "test_guild") {
        premiumVal = "• **Estado:** `Próximamente` *(Servidor de pruebas exento)*";
      } else {
        premiumVal = "• **Estado:** `Exención Autorizada`";
      }
    } else {
      premiumVal = "• **Estado:** `Próximamente` *(planes y cuotas ampliadas en desarrollo)*";
    }

    const description = isExhaustionNotice
      ? `Hola **${username}**, has alcanzado el límite diario de tus cuotas de Inteligencia Artificial (40 mensajes de conversación y 20 consultas de investigación). Ambas cuotas se restablecerán a las 00:00 (hora Ecuador) ♡`
      : `Hola **${username}**, aquí tienes el estado de tus depósitos para el ciclo diario actual:`;

    return new EmbedBuilder()
      .setColor(isExhaustionNotice ? 0xff6b81 : 0xffb7c5)
      .setTitle("📊 Consumo y Cuotas de Hoshiko AI")
      .setDescription(description)
      .addFields(
        {
          name: "💬 Conversación Diaria",
          value: convVal,
          inline: true,
        },
        {
          name: "🔍 Búsqueda e Investigación",
          value: resVal,
          inline: true,
        },
        {
          name: "⏳ Próximo Reinicio Diario",
          value: `• **Tiempo restante:** ${timeText}\n*(Reinicio diario a las 00:00 hora de Ecuador • America/Guayaquil)*`,
          inline: false,
        },
        {
          name: "⭐ Beneficios Premium",
          value: premiumVal,
          inline: false,
        },
      )
      .setFooter({ text: "Hoshiko AI • Zona Horaria: Ecuador (UTC-5) ♡" });
  }

  static clearMemoryStore(): void {
    this.fallbackStore.clear();
    this.memoryExhaustionNotices.clear();
  }
}
