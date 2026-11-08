export type QuotaType = "conversation" | "research";

export interface QuotaStatus {
  userId: string;
  quotaType: QuotaType;
  maxCapacity: number;
  balance: number;
  consumedInCycle: number;
  cycleStartTime: number;
  nextRenewalTime: number;
  timeUntilRenewalMs: number;
  isExempt?: boolean;
}

export interface DualQuotaStatus {
  userId: string;
  conversation: QuotaStatus;
  research: QuotaStatus;
  bothExhausted: boolean;
  isExempt?: boolean;
  exemptionRole?: "owner" | "test_guild" | "developer" | "tester" | "none";
}

export const QUOTA_LIMITS: Record<QuotaType, number> = {
  conversation: 40,
  research: 20,
};

export const ECUADOR_TIMEZONE = "America/Guayaquil";
export const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000;
export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const CYCLE_DURATION_MS = DAY_IN_MS;

export function getEcuadorCycleInfo(nowMs: number = Date.now()): {
  cycleStart: number;
  nextRenewalTime: number;
  timeUntilRenewalMs: number;
} {
  const localEcuadorMs = nowMs + ECUADOR_OFFSET_MS;
  const dayIndex = Math.floor(localEcuadorMs / DAY_IN_MS);
  const cycleStart = dayIndex * DAY_IN_MS - ECUADOR_OFFSET_MS;
  const nextRenewalTime = (dayIndex + 1) * DAY_IN_MS - ECUADOR_OFFSET_MS;
  const timeUntilRenewalMs = Math.max(0, nextRenewalTime - nowMs);
  return { cycleStart, nextRenewalTime, timeUntilRenewalMs };
}
