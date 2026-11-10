import { IUserRecord, UserHistory } from "./userTracking.models";
import { TrackingOptOutManager } from "./TrackingOptOutManager";

const MAX_USER_HISTORY_RECORDS = 40;

export class UserHistoryManager {
  static async addUser(
    userId: string,
    record: Omit<IUserRecord, "createdAt"> & { createdAt?: Date },
  ): Promise<void> {
    if (!userId) return;

    // Respetar derecho de oposición (Opt-out)
    if (await TrackingOptOutManager.isOptedOut(userId)) {
      return;
    }

    const normalizedRecord = {
      ...record,
      createdAt: record.createdAt ?? new Date(),
    };

    const alreadyExists = await UserHistory.exists({
      userId,
      records: {
        $elemMatch: {
          username: normalizedRecord.username,
          discriminator: normalizedRecord.discriminator,
          avatarUrl: normalizedRecord.avatarUrl,
          guildId: normalizedRecord.guildId ?? null,
          source: normalizedRecord.source,
        },
      },
    });

    if (alreadyExists) return;

    await UserHistory.updateOne(
      { userId },
      {
        $push: {
          records: {
            $each: [normalizedRecord as IUserRecord],
            $position: 0,
            $slice: MAX_USER_HISTORY_RECORDS,
          },
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }

  static async getHistory(userId: string, guildId?: string) {
    const history = await UserHistory.findOne({ userId });
    const records = history?.records ?? [];
    if (!guildId) return records;
    return records.filter((record) => record.guildId === guildId);
  }

  static async deleteHistory(userId: string): Promise<number> {
    if (!userId) return 0;
    const res = await UserHistory.deleteOne({ userId });
    return res.deletedCount || 0;
  }
}
