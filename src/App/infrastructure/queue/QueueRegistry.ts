export class QueueRegistry {
  private static readonly activeQueues: readonly string[] = Object.freeze([]);

  static getActiveQueues(): readonly string[] {
    return this.activeQueues;
  }

  static getActiveQueueCount(): number {
    return this.activeQueues.length;
  }

  static getStatus(): {
    enabled: boolean;
    queuesActive: number;
    queues: readonly string[];
  } {
    return {
      enabled: false,
      queuesActive: this.getActiveQueueCount(),
      queues: this.getActiveQueues(),
    };
  }
}
