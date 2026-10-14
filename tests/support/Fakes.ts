import type {
  Clock,
  ModerationGateway,
  ModerationGatewayInput,
  ModerationLogEvent,
  ModerationLogFields,
  ModerationLogger,
} from "../../src/Services/temp-moderation/contracts/index.js";
import { ModerationGatewayError } from "../../src/Services/temp-moderation/TempModerationProcessor.js";

export class FakeClock implements Clock {
  constructor(private currentTime: Date) {}

  now(): Date {
    return new Date(this.currentTime);
  }

  advanceBy(milliseconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
}

export interface FakeGatewayCall extends ModerationGatewayInput {
  action: "removeBan" | "clearTimeout";
}

interface DeferredAction {
  started: Promise<void>;
  notifyStarted: () => void;
  action: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class FakeModerationGateway implements ModerationGateway {
  readonly calls: FakeGatewayCall[] = [];
  private nextFailure: ModerationGatewayError | null = null;
  private nextDeferred: DeferredAction | null = null;

  failNext(error: ModerationGatewayError): void {
    this.nextFailure = error;
  }

  deferNext(): {
    started: Promise<void>;
    resolve: () => void;
    reject: (error: unknown) => void;
  } {
    let notifyStarted = (): void => undefined;
    let resolveAction = (): void => undefined;
    let rejectAction = (_error: unknown): void => undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const action = new Promise<void>((resolve, reject) => {
      resolveAction = resolve;
      rejectAction = reject;
    });
    this.nextDeferred = {
      started,
      notifyStarted,
      action,
      resolve: resolveAction,
      reject: rejectAction,
    };
    return { started, resolve: resolveAction, reject: rejectAction };
  }

  async removeBan(input: ModerationGatewayInput): Promise<void> {
    await this.run("removeBan", input);
  }

  async clearTimeout(input: ModerationGatewayInput): Promise<void> {
    await this.run("clearTimeout", input);
  }

  private async run(
    actionName: FakeGatewayCall["action"],
    input: ModerationGatewayInput,
  ): Promise<void> {
    this.calls.push({ action: actionName, ...input });
    if (this.nextFailure) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw failure;
    }

    if (this.nextDeferred) {
      const deferred = this.nextDeferred;
      this.nextDeferred = null;
      deferred.notifyStarted();
      await deferred.action;
    }
  }
}

export class FakeModerationLogger implements ModerationLogger {
  readonly entries: Array<{
    level: "info" | "warn" | "error";
    event: ModerationLogEvent;
    fields: ModerationLogFields;
  }> = [];

  info(event: ModerationLogEvent, fields: ModerationLogFields): void {
    this.entries.push({ level: "info", event, fields: { ...fields } });
  }

  warn(event: ModerationLogEvent, fields: ModerationLogFields): void {
    this.entries.push({ level: "warn", event, fields: { ...fields } });
  }

  error(event: ModerationLogEvent, fields: ModerationLogFields): void {
    this.entries.push({ level: "error", event, fields: { ...fields } });
  }
}
