import { randomUUID } from "node:crypto";
import type {
  ClaimTempModerationInput,
  ClaimedTempModeration,
  CompleteTempModerationInput,
  ModerationErrorCode,
  PermanentFailureInput,
  ReleaseTempModerationInput,
  ReleaseTempModerationResult,
  TempModerationRecord,
  TempModerationRepository,
} from "../contracts/index.js";
import {
  MODERATION_LEASE_MS,
  MODERATION_MAX_ATTEMPTS,
  MODERATION_RETRY_BACKOFF_MS,
} from "../contracts/index.js";

export {
  MODERATION_LEASE_MS,
  MODERATION_MAX_ATTEMPTS,
  MODERATION_RETRY_BACKOFF_MS,
};

export type MongoFilter = Record<string, unknown>;

export interface MongoUpdate {
  $set?: Record<string, unknown>;
  $inc?: Record<string, number>;
  $unset?: Record<string, "" | 1>;
}

export interface TempModerationMongoDocument {
  _id: unknown;
  guildId: string;
  userId: string;
  moderationType: "ban" | "mute";
  expiresAt: Date;
  expectedTimeoutUntil?: Date | null;
  status: "pending" | "completed" | "permanentFailure";
  revision: number;
  leaseToken?: string | null;
  leaseUntil?: Date | null;
  attempts: number;
  nextAttemptAt?: Date | null;
  completedAt?: Date | null;
  permanentFailureAt?: Date | null;
  failureCode?: ModerationErrorCode | null;
}

export interface MongoCollectionLike<
  TDocument extends TempModerationMongoDocument,
> {
  findOneAndUpdate(
    filter: MongoFilter,
    update: MongoUpdate,
    options: { returnDocument: "after"; includeResultMetadata: false },
  ): Promise<TDocument | null>;
  updateOne(
    filter: MongoFilter,
    update: MongoUpdate,
  ): Promise<{ matchedCount: number }>;
}

export interface MongoTempModerationRepositoryOptions {
  createLeaseToken?: () => string;
  toMongoId?: (id: string) => unknown;
}

const MODERATION_ERROR_CODES = new Set<ModerationErrorCode>([
  "discord_unavailable",
  "discord_rate_limited",
  "forbidden",
  "not_found",
  "gateway_timeout",
  "gateway_error",
  "unknown",
]);

function assertSafeFailureCode(
  code: string,
): asserts code is ModerationErrorCode {
  if (!MODERATION_ERROR_CODES.has(code as ModerationErrorCode)) {
    throw new TypeError("invalid_moderation_failure_code");
  }
}

function toRecord(document: TempModerationMongoDocument): TempModerationRecord {
  return {
    id: String(document._id),
    guildId: document.guildId,
    userId: document.userId,
    moderationType: document.moderationType,
    expiresAt: new Date(document.expiresAt),
    expectedTimeoutUntil: document.expectedTimeoutUntil
      ? new Date(document.expectedTimeoutUntil)
      : null,
    status: document.status,
    revision: document.revision,
    leaseToken: document.leaseToken ?? null,
    leaseUntil: document.leaseUntil ? new Date(document.leaseUntil) : null,
    attempts: document.attempts,
    nextAttemptAt: document.nextAttemptAt
      ? new Date(document.nextAttemptAt)
      : null,
    completedAt: document.completedAt ? new Date(document.completedAt) : null,
    permanentFailureAt: document.permanentFailureAt
      ? new Date(document.permanentFailureAt)
      : null,
    failureCode: document.failureCode ?? null,
  };
}

function leaseEligibility(now: Date): MongoFilter[] {
  return [
    {
      $or: [
        { nextAttemptAt: { $exists: false } },
        { nextAttemptAt: null },
        { nextAttemptAt: { $lte: now } },
      ],
    },
    {
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: null },
        { leaseUntil: { $lte: now } },
      ],
    },
  ];
}

export function buildClaimFilter(
  input: ClaimTempModerationInput,
  mongoId: unknown = input.recordId,
): MongoFilter {
  return {
    _id: mongoId,
    status: "pending",
    revision: input.expectedRevision,
    expiresAt: { $eq: input.expectedExpiresAt, $lte: input.now },
    expectedTimeoutUntil: input.expectedTimeoutUntil,
    attempts: { $lt: MODERATION_MAX_ATTEMPTS },
    $and: leaseEligibility(input.now),
  };
}

export class MongoTempModerationRepository implements TempModerationRepository {
  private readonly createLeaseToken: () => string;
  private readonly toMongoId: (id: string) => unknown;

  constructor(
    private readonly collection: MongoCollectionLike<TempModerationMongoDocument>,
    options: MongoTempModerationRepositoryOptions = {},
  ) {
    this.createLeaseToken = options.createLeaseToken ?? randomUUID;
    this.toMongoId = options.toMongoId ?? ((id) => id);
  }

  async claim(
    input: ClaimTempModerationInput,
  ): Promise<ClaimedTempModeration | null> {
    const leaseToken = this.createLeaseToken();
    const leaseUntil = new Date(input.now.getTime() + MODERATION_LEASE_MS);
    const document = await this.collection.findOneAndUpdate(
      buildClaimFilter(input, this.toMongoId(input.recordId)),
      {
        $inc: { attempts: 1, revision: 1 },
        $set: { leaseToken, leaseUntil },
        $unset: { nextAttemptAt: "" },
      },
      { returnDocument: "after", includeResultMetadata: false },
    );

    return document ? { record: toRecord(document), leaseToken } : null;
  }

  async complete(input: CompleteTempModerationInput): Promise<boolean> {
    const result = await this.collection.updateOne(
      this.ownedPendingFilter(input.recordId, input.leaseToken, input.revision),
      {
        $set: { status: "completed", completedAt: input.completedAt },
        $inc: { revision: 1 },
        $unset: { leaseToken: "", leaseUntil: "", nextAttemptAt: "" },
      },
    );
    return result.matchedCount === 1;
  }

  async releaseForRetry(
    input: ReleaseTempModerationInput,
  ): Promise<ReleaseTempModerationResult> {
    assertSafeFailureCode(input.failureCode);
    if (
      !Number.isInteger(input.attempts) ||
      input.attempts < 1 ||
      input.attempts > MODERATION_MAX_ATTEMPTS
    ) {
      throw new RangeError("invalid_moderation_attempt_count");
    }

    if (input.attempts === MODERATION_MAX_ATTEMPTS) {
      const permanentFailureAt = new Date(input.now);
      const result = await this.collection.updateOne(
        this.ownedPendingFilter(
          input.recordId,
          input.leaseToken,
          input.revision,
          input.attempts,
        ),
        {
          $set: {
            status: "permanentFailure",
            permanentFailureAt,
            failureCode: input.failureCode,
          },
          $inc: { revision: 1 },
          $unset: { leaseToken: "", leaseUntil: "", nextAttemptAt: "" },
        },
      );
      return result.matchedCount === 1
        ? { status: "permanentFailure", permanentFailureAt }
        : { status: "leaseLost" };
    }

    const nextAttemptAt = new Date(
      input.now.getTime() + MODERATION_RETRY_BACKOFF_MS[input.attempts - 1],
    );
    const result = await this.collection.updateOne(
      this.ownedPendingFilter(
        input.recordId,
        input.leaseToken,
        input.revision,
        input.attempts,
      ),
      {
        $set: { nextAttemptAt, failureCode: input.failureCode },
        $inc: { revision: 1 },
        $unset: { leaseToken: "", leaseUntil: "" },
      },
    );
    return result.matchedCount === 1
      ? { status: "retryScheduled", nextAttemptAt }
      : { status: "leaseLost" };
  }

  async markPermanentFailure(input: PermanentFailureInput): Promise<boolean> {
    assertSafeFailureCode(input.failureCode);
    const result = await this.collection.updateOne(
      this.ownedPendingFilter(input.recordId, input.leaseToken, input.revision),
      {
        $set: {
          status: "permanentFailure",
          permanentFailureAt: input.permanentFailureAt,
          failureCode: input.failureCode,
        },
        $inc: { revision: 1 },
        $unset: { leaseToken: "", leaseUntil: "", nextAttemptAt: "" },
      },
    );
    return result.matchedCount === 1;
  }

  private ownedPendingFilter(
    recordId: string,
    leaseToken: string,
    revision: number,
    attempts?: number,
  ): MongoFilter {
    return {
      _id: this.toMongoId(recordId),
      status: "pending",
      leaseToken,
      revision,
      ...(attempts === undefined ? {} : { attempts }),
    };
  }
}
