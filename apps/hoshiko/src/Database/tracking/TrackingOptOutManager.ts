import {
  AvatarHistory,
  PresenceHistory,
  TrackingOptOut,
  UserHistory,
} from "./userTracking.models";

export class TrackingOptOutManager {
  private static memoryCache = new Set<string>();

  /**
   * Determina si el usuario ha ejercido su derecho de oposición (opt-out).
   */
  static async isOptedOut(userId: string): Promise<boolean> {
    if (!userId) return false;
    if (this.memoryCache.has(userId)) return true;

    try {
      const record = await TrackingOptOut.findOne({ userId, optedOut: true });
      if (record) {
        this.memoryCache.add(userId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Configura la preferencia de oposición (opt-out) del usuario.
   */
  static async setOptOut(userId: string, optedOut: boolean): Promise<boolean> {
    if (!userId) return false;

    try {
      await TrackingOptOut.findOneAndUpdate(
        { userId },
        { $set: { optedOut, optedOutAt: new Date() } },
        { upsert: true, new: true },
      );

      if (optedOut) {
        this.memoryCache.add(userId);
      } else {
        this.memoryCache.delete(userId);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ejercicio del derecho de supresión (Right to Erasure / Eliminación) de todos los datos
   * recopilados de perfiles, avatares y presencias del usuario.
   */
  static async purgeAllTrackingData(userId: string): Promise<{
    avatarsDeleted: number;
    userRecordsDeleted: number;
    presenceDeleted: number;
  }> {
    if (!userId) {
      return { avatarsDeleted: 0, userRecordsDeleted: 0, presenceDeleted: 0 };
    }

    try {
      const [avatarsRes, usersRes, presenceRes] = await Promise.all([
        AvatarHistory.deleteMany({ userId }),
        UserHistory.deleteMany({ userId }),
        PresenceHistory.deleteMany({ userId }),
      ]);

      return {
        avatarsDeleted: avatarsRes.deletedCount || 0,
        userRecordsDeleted: usersRes.deletedCount || 0,
        presenceDeleted: presenceRes.deletedCount || 0,
      };
    } catch (err) {
      console.error("[TrackingOptOutManager] Error al purgar datos de seguimiento:", err);
      return { avatarsDeleted: 0, userRecordsDeleted: 0, presenceDeleted: 0 };
    }
  }
}
