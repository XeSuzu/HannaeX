import type {
  Clock,
  ModerationErrorCode,
  ModerationGateway,
  ModerationLogger,
  TempModerationRepository,
} from "./contracts/index.js";

export type TempModerationProcessResult =
  | { status: "completed"; recordId: string }
  | {
      status: "skipped";
      recordId: string;
      reason: "not-claimable" | "lease-lost";
    }
  | { status: "retryScheduled"; recordId: string; retryAt: Date }
  | {
      status: "permanentFailure";
      recordId: string;
      errorCode: ModerationErrorCode;
    };

export class ModerationGatewayError extends Error {
  constructor(
    readonly code: ModerationErrorCode,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "ModerationGatewayError";
  }
}

export interface TempModerationProcessorOptions {
  repository: TempModerationRepository;
  gateway: ModerationGateway;
  clock: Clock;
  logger: ModerationLogger;
}

/**
 * Isolated contract harness for a future processor. It has no production callers
 * and performs no work until processExpiration is explicitly invoked.
 */
export class TempModerationProcessor {
  constructor(private readonly options: TempModerationProcessorOptions) {}

  async processExpiration(input: {
    recordId: string;
    expectedExpiresAt: Date;
    expectedTimeoutUntil: Date | null;
    expectedRevision: number;
  }): Promise<TempModerationProcessResult> {
    const now = this.options.clock.now();
    const claim = await this.options.repository.claim({
      recordId: input.recordId,
      expectedExpiresAt: input.expectedExpiresAt,
      expectedTimeoutUntil: input.expectedTimeoutUntil,
      expectedRevision: input.expectedRevision,
      now,
    });

    if (!claim) {
      this.options.logger.info("expiration_skipped", {
        recordId: input.recordId,
        result: "skipped",
      });
      return {
        status: "skipped",
        recordId: input.recordId,
        reason: "not-claimable",
      };
    }

    const { record } = claim;
    const logContext = {
      recordId: record.id,
      guildId: record.guildId,
      userId: record.userId,
      moderationType: record.moderationType,
      attempt: record.attempts,
    };

    try {
      const action = {
        guildId: record.guildId,
        userId: record.userId,
        expectedTimeoutUntil: record.expectedTimeoutUntil ?? null,
      };
      if (record.moderationType === "ban") {
        await this.options.gateway.removeBan(action);
      } else {
        await this.options.gateway.clearTimeout(action);
      }
    } catch (error) {
      const gatewayError =
        error instanceof ModerationGatewayError
          ? error
          : new ModerationGatewayError("gateway_error", true);

      if (!gatewayError.retryable) {
        const marked = await this.options.repository.markPermanentFailure({
          recordId: record.id,
          leaseToken: claim.leaseToken,
          revision: record.revision,
          permanentFailureAt: this.options.clock.now(),
          failureCode: gatewayError.code,
        });
        if (!marked) {
          return {
            status: "skipped",
            recordId: record.id,
            reason: "lease-lost",
          };
        }

        this.options.logger.error("expiration_permanent_failure", {
          ...logContext,
          result: "permanentFailure",
          errorCode: gatewayError.code,
        });
        return {
          status: "permanentFailure",
          recordId: record.id,
          errorCode: gatewayError.code,
        };
      }

      const released = await this.options.repository.releaseForRetry({
        recordId: record.id,
        leaseToken: claim.leaseToken,
        revision: record.revision,
        attempts: record.attempts,
        now: this.options.clock.now(),
        failureCode: gatewayError.code,
      });
      if (released.status === "leaseLost") {
        return {
          status: "skipped",
          recordId: record.id,
          reason: "lease-lost",
        };
      }

      if (released.status === "permanentFailure") {
        this.options.logger.error("expiration_permanent_failure", {
          ...logContext,
          result: "permanentFailure",
          errorCode: gatewayError.code,
        });
        return {
          status: "permanentFailure",
          recordId: record.id,
          errorCode: gatewayError.code,
        };
      }

      this.options.logger.warn("expiration_retry_scheduled", {
        ...logContext,
        result: "retryScheduled",
        errorCode: gatewayError.code,
        retryAt: released.nextAttemptAt.toISOString(),
      });
      return {
        status: "retryScheduled",
        recordId: record.id,
        retryAt: released.nextAttemptAt,
      };
    }

    const completed = await this.options.repository.complete({
      recordId: record.id,
      leaseToken: claim.leaseToken,
      revision: record.revision,
      completedAt: this.options.clock.now(),
    });
    if (!completed) {
      return {
        status: "skipped",
        recordId: record.id,
        reason: "lease-lost",
      };
    }

    this.options.logger.info("expiration_completed", {
      ...logContext,
      result: "completed",
    });
    return { status: "completed", recordId: record.id };
  }
}
