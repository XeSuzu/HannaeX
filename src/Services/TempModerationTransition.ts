import type { FailureCode } from "../Models/TempModeration";

export const UNKNOWN_BAN_CODE = 10026;
export const UNKNOWN_MEMBER_CODE = 10007;
export const MAX_ATTEMPTS = 5;
export const BACKOFF_DELAYS_MS = [30000, 60000, 120000, 300000];

export function getFailureCode(error: any): FailureCode {
  const code = Number(error?.code || error?.rawError?.code);
  if (code === 50013) return "MissingPermissions";
  if (code === 10004) return "UnknownGuild";
  if (code === 10011) return "UnknownRole";
  if (error?.status === 429) return "RateLimited";
  if (code === UNKNOWN_MEMBER_CODE) return "UnknownUser";
  return "Other";
}

export interface TransitionResult {
  attempts: number;
  status: "pending" | "permanentFailure";
  failureCode?: FailureCode;
  nextAttemptAt?: Date;
}

export function calculateNextTransition(
  currentAttempts: number,
  error: any,
  nowMs: number = Date.now()
): TransitionResult {
  const attempts = (currentAttempts || 0) + 1;
  
  if (attempts >= MAX_ATTEMPTS) {
    return {
      attempts,
      status: "permanentFailure",
      failureCode: getFailureCode(error),
    };
  }
  
  const backoff = BACKOFF_DELAYS_MS[attempts - 1] || 300000;
  return {
    attempts,
    status: "pending",
    nextAttemptAt: new Date(nowMs + backoff),
  };
}
