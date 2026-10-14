export type TempModerationType = "ban" | "mute";

export type TempModerationStatus = "pending" | "completed" | "permanentFailure";

export type ModerationErrorCode =
  | "discord_unavailable"
  | "discord_rate_limited"
  | "forbidden"
  | "not_found"
  | "gateway_timeout"
  | "gateway_error"
  | "unknown";

export const MODERATION_MAX_ATTEMPTS = 5;
export const MODERATION_RETRY_BACKOFF_MS = [
  30_000, 60_000, 120_000, 300_000, 600_000,
] as const;
export const MODERATION_LEASE_MS = 120_000;

export interface TempModerationRecord {
  id: string;
  guildId: string;
  userId: string;
  moderationType: TempModerationType;
  expiresAt: Date;
  expectedTimeoutUntil?: Date | null;
  status: TempModerationStatus;
  revision: number;
  leaseToken: string | null;
  leaseUntil: Date | null;
  attempts: number;
  nextAttemptAt: Date | null;
  completedAt: Date | null;
  permanentFailureAt: Date | null;
  failureCode: ModerationErrorCode | null;
}

export interface ClaimTempModerationInput {
  recordId: string;
  expectedExpiresAt: Date;
  expectedTimeoutUntil: Date | null;
  expectedRevision: number;
  now: Date;
}

export interface ClaimedTempModeration {
  record: TempModerationRecord;
  leaseToken: string;
}

export interface CompleteTempModerationInput {
  recordId: string;
  leaseToken: string;
  revision: number;
  completedAt: Date;
}

export interface ReleaseTempModerationInput {
  recordId: string;
  leaseToken: string;
  revision: number;
  attempts: number;
  now: Date;
  failureCode: ModerationErrorCode;
}

export interface PermanentFailureInput {
  recordId: string;
  leaseToken: string;
  revision: number;
  permanentFailureAt: Date;
  failureCode: ModerationErrorCode;
}

export type ReleaseTempModerationResult =
  | { status: "retryScheduled"; nextAttemptAt: Date }
  | { status: "permanentFailure"; permanentFailureAt: Date }
  | { status: "leaseLost" };

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: readonly number[];
}

/** Each successful claim receives a repository-generated lease token. */
export interface TempModerationRepository {
  claim(input: ClaimTempModerationInput): Promise<ClaimedTempModeration | null>;
  complete(input: CompleteTempModerationInput): Promise<boolean>;
  releaseForRetry(
    input: ReleaseTempModerationInput,
  ): Promise<ReleaseTempModerationResult>;
  markPermanentFailure(input: PermanentFailureInput): Promise<boolean>;
}

export interface ModerationGatewayInput {
  guildId: string;
  userId: string;
  expectedTimeoutUntil: Date | null;
}

/** Only actions needed by expiration processing; no Discord types cross this boundary. */
export interface ModerationGateway {
  removeBan(input: ModerationGatewayInput): Promise<void>;
  clearTimeout(input: ModerationGatewayInput): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export type ModerationLogEvent =
  | "expiration_skipped"
  | "expiration_completed"
  | "expiration_retry_scheduled"
  | "expiration_permanent_failure";

/** Allowlist only; never add reason text, credentials, payloads, or lease tokens. */
export interface ModerationLogFields {
  recordId?: string;
  guildId?: string;
  userId?: string;
  moderationType?: TempModerationType;
  attempt?: number;
  result?: "completed" | "skipped" | "retryScheduled" | "permanentFailure";
  errorCode?: ModerationErrorCode;
  retryAt?: string;
}

export interface ModerationLogger {
  info(event: ModerationLogEvent, fields: ModerationLogFields): void;
  warn(event: ModerationLogEvent, fields: ModerationLogFields): void;
  error(event: ModerationLogEvent, fields: ModerationLogFields): void;
}
