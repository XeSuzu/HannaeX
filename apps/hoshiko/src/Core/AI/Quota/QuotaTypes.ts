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
}

export interface DualQuotaStatus {
  userId: string;
  conversation: QuotaStatus;
  research: QuotaStatus;
  bothExhausted: boolean;
}

export const QUOTA_LIMITS: Record<QuotaType, number> = {
  conversation: 40,
  research: 20,
};

export const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas exactas
