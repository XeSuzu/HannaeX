import type {
  ClaimTempModerationInput,
  ClaimedTempModeration,
  CompleteTempModerationInput,
  PermanentFailureInput,
  ReleaseTempModerationInput,
  ReleaseTempModerationResult,
  TempModerationRecord,
  TempModerationRepository,
} from "../../src/Services/temp-moderation/contracts/index.js";
import {
  MODERATION_LEASE_MS,
  MODERATION_MAX_ATTEMPTS,
  MODERATION_RETRY_BACKOFF_MS,
} from "../../src/Services/temp-moderation/contracts/index.js";

function cloneRecord(record: TempModerationRecord): TempModerationRecord {
  return {
    ...record,
    expiresAt: new Date(record.expiresAt),
    expectedTimeoutUntil: record.expectedTimeoutUntil
      ? new Date(record.expectedTimeoutUntil)
      : null,
    leaseUntil: record.leaseUntil ? new Date(record.leaseUntil) : null,
    nextAttemptAt: record.nextAttemptAt ? new Date(record.nextAttemptAt) : null,
    completedAt: record.completedAt ? new Date(record.completedAt) : null,
    permanentFailureAt: record.permanentFailureAt
      ? new Date(record.permanentFailureAt)
      : null,
  };
}

export class InMemoryTempModerationRepository implements TempModerationRepository {
  private readonly records = new Map<string, TempModerationRecord>();
  readonly calls = { claim: 0, complete: 0, releaseForRetry: 0, permanent: 0 };
  readonly claimInputs: ClaimTempModerationInput[] = [];
  readonly claimResults: TempModerationRecord[] = [];
  private tokenNumber = 0;
  private readonly createLeaseToken: () => string;

  constructor(
    records: TempModerationRecord[] = [],
    options: { createLeaseToken?: () => string } = {},
  ) {
    this.createLeaseToken =
      options.createLeaseToken ?? (() => `memory-lease-${++this.tokenNumber}`);
    for (const record of records) {
      this.records.set(record.id, cloneRecord(record));
    }
  }

  async claim(
    input: ClaimTempModerationInput,
  ): Promise<ClaimedTempModeration | null> {
    this.calls.claim += 1;
    this.claimInputs.push({
      ...input,
      expectedExpiresAt: new Date(input.expectedExpiresAt),
      expectedTimeoutUntil: input.expectedTimeoutUntil
        ? new Date(input.expectedTimeoutUntil)
        : null,
      now: new Date(input.now),
    });
    const record = this.records.get(input.recordId);
    if (
      !record ||
      record.status !== "pending" ||
      record.revision !== input.expectedRevision ||
      record.expiresAt.getTime() !== input.expectedExpiresAt.getTime() ||
      record.expiresAt.getTime() > input.now.getTime() ||
      (record.expectedTimeoutUntil?.getTime() ?? null) !==
        (input.expectedTimeoutUntil?.getTime() ?? null) ||
      record.attempts >= MODERATION_MAX_ATTEMPTS ||
      (record.nextAttemptAt &&
        record.nextAttemptAt.getTime() > input.now.getTime()) ||
      (record.leaseUntil && record.leaseUntil.getTime() > input.now.getTime())
    ) {
      return null;
    }

    const leaseToken = this.createLeaseToken();
    record.leaseToken = leaseToken;
    record.leaseUntil = new Date(input.now.getTime() + MODERATION_LEASE_MS);
    record.attempts += 1;
    record.revision += 1;
    record.nextAttemptAt = null;
    const claimedRecord = cloneRecord(record);
    this.claimResults.push(claimedRecord);
    return { record: claimedRecord, leaseToken };
  }

  async complete(input: CompleteTempModerationInput): Promise<boolean> {
    this.calls.complete += 1;
    const record = this.records.get(input.recordId);
    if (
      !record ||
      record.status !== "pending" ||
      record.leaseToken !== input.leaseToken ||
      record.revision !== input.revision
    ) {
      return false;
    }

    record.status = "completed";
    record.completedAt = new Date(input.completedAt);
    record.leaseToken = null;
    record.leaseUntil = null;
    record.nextAttemptAt = null;
    record.revision += 1;
    return true;
  }

  async releaseForRetry(
    input: ReleaseTempModerationInput,
  ): Promise<ReleaseTempModerationResult> {
    this.calls.releaseForRetry += 1;
    const record = this.records.get(input.recordId);
    if (
      !record ||
      record.status !== "pending" ||
      record.leaseToken !== input.leaseToken ||
      record.revision !== input.revision ||
      record.attempts !== input.attempts
    ) {
      return { status: "leaseLost" };
    }

    record.failureCode = input.failureCode;
    record.leaseToken = null;
    record.leaseUntil = null;
    record.revision += 1;

    if (input.attempts === MODERATION_MAX_ATTEMPTS) {
      record.status = "permanentFailure";
      record.permanentFailureAt = new Date(input.now);
      record.nextAttemptAt = null;
      return {
        status: "permanentFailure",
        permanentFailureAt: new Date(input.now),
      };
    }

    const nextAttemptAt = new Date(
      input.now.getTime() + MODERATION_RETRY_BACKOFF_MS[input.attempts - 1],
    );
    record.nextAttemptAt = nextAttemptAt;
    return { status: "retryScheduled", nextAttemptAt: new Date(nextAttemptAt) };
  }

  async markPermanentFailure(input: PermanentFailureInput): Promise<boolean> {
    this.calls.permanent += 1;
    const record = this.records.get(input.recordId);
    if (
      !record ||
      record.status !== "pending" ||
      record.leaseToken !== input.leaseToken ||
      record.revision !== input.revision
    ) {
      return false;
    }

    record.status = "permanentFailure";
    record.failureCode = input.failureCode;
    record.permanentFailureAt = new Date(input.permanentFailureAt);
    record.leaseToken = null;
    record.leaseUntil = null;
    record.nextAttemptAt = null;
    record.revision += 1;
    return true;
  }

  inspect(recordId: string): TempModerationRecord | null {
    const record = this.records.get(recordId);
    return record ? cloneRecord(record) : null;
  }
}
