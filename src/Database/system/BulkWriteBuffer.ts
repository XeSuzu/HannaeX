import LocalLevel from "../leveling/localLevel.model";
import GlobalProfile from "../moderation/globalProfile.model";

const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos (Pilar 6)

const pendingLocalMessages = new Map<string, { guildId: string; userId: string; inc: number }>();
const pendingReputation = new Map<string, number>();
let flushTimer: NodeJS.Timeout | null = null;

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushBulkWrites();
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
}

/**
 * Acumula incrementos menores de mensajes locales en memoria para volcarlos cada 5 minutos.
 */
export function queueLocalMessageIncrement(
  guildId: string,
  userId: string,
  amount = 1,
): void {
  ensureFlushTimer();
  const key = `${guildId}:${userId}`;
  const current = pendingLocalMessages.get(key);
  if (current) {
    current.inc += amount;
  } else {
    pendingLocalMessages.set(key, { guildId, userId, inc: amount });
  }
}

/**
 * Acumula ajustes de Trust Score / Reputación global para volcarlos en bloque cada 5 minutos.
 */
export function queueTrustScoreDelta(userId: string, delta: number): void {
  ensureFlushTimer();
  pendingReputation.set(userId, (pendingReputation.get(userId) ?? 0) + delta);
}

export function getPendingBulkCounts(): {
  localMessages: number;
  reputation: number;
} {
  return {
    localMessages: pendingLocalMessages.size,
    reputation: pendingReputation.size,
  };
}

/**
 * Vuelca todas las escrituras acumuladas a MongoDB usando `bulkWrite`.
 */
export async function flushBulkWrites(): Promise<{
  localFlushed: number;
  reputationFlushed: number;
}> {
  const localEntries = Array.from(pendingLocalMessages.values());
  const repEntries = Array.from(pendingReputation.entries());
  pendingLocalMessages.clear();
  pendingReputation.clear();

  let localFlushed = 0;
  let reputationFlushed = 0;

  if (localEntries.length > 0) {
    try {
      await LocalLevel.bulkWrite(
        localEntries.map((e) => ({
          updateOne: {
            filter: { userId: e.userId, guildId: e.guildId },
            update: { $inc: { messagesSent: e.inc } },
          },
        })),
        { ordered: false },
      );
      localFlushed = localEntries.length;
    } catch (err) {
      console.error("[BulkWriteBuffer] Error en LocalLevel.bulkWrite:", err);
    }
  }

  if (repEntries.length > 0) {
    try {
      await GlobalProfile.bulkWrite(
        repEntries.map(([userId, delta]) => ({
          updateOne: {
            filter: { userId },
            update: { $inc: { reputation: delta } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      reputationFlushed = repEntries.length;
    } catch (err) {
      console.error("[BulkWriteBuffer] Error en GlobalProfile.bulkWrite:", err);
    }
  }

  return { localFlushed, reputationFlushed };
}
