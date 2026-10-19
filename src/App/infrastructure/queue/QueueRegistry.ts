export class QueueRegistry {
  private static readonly registeredQueues = new Set<string>();

  static markActive(queueName: string): void {
    this.registeredQueues.add(queueName);
  }

  static getActiveQueues(): readonly string[] {
    return Object.freeze(Array.from(this.registeredQueues));
  }

  static getActiveQueueCount(): number {
    return this.registeredQueues.size;
  }

  static getStatus(): {
    enabled: boolean;
    queuesActive: number;
    queues: readonly string[];
  } {
    return {
      enabled: this.registeredQueues.size > 0,
      queuesActive: this.getActiveQueueCount(),
      queues: this.getActiveQueues(),
    };
  }
}
