export interface JobContext {
  queueName: string;
  createdAt: number;
  correlationId: string;
}

export interface QueueJob<TPayload> {
  name: string;
  payload: TPayload;
  version: string;
  correlationId: string;
  idempotencyKey?: string;
  createdAt: number;
}

export type QueueAvailability = "disabled" | "optional-ready" | "idle" | "degraded";
