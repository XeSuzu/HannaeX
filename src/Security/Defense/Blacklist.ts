import fs from 'fs';
import path from 'path';

type BlockRecord = { reason?: string; type?: 'TEMPORAL' | 'PERMANENT'; expiresAt?: number | null };

const store = new Map<string, BlockRecord>();

export class Blacklist {
  static isBlocked(userId: string): boolean {
    const rec = store.get(userId);
    if (!rec) return false;
    if (rec.expiresAt && Date.now() > rec.expiresAt) {
      store.delete(userId);
      return false;
    }
    return true;
  }

  static add(userId: string, reason?: string, type: 'TEMPORAL' | 'PERMANENT' = 'PERMANENT', durationMinutes?: number) {
    const expiresAt = type === 'TEMPORAL' && durationMinutes ? Date.now() + durationMinutes * 60 * 1000 : null;
    store.set(userId, { reason, type, expiresAt });
  }

  static remove(userId: string) {
    store.delete(userId);
  }

  static info(userId: string): BlockRecord | null {
    return store.get(userId) ?? null;
  }
}