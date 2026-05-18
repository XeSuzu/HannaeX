import UserHistory, { IUserRecord } from "../Models/UserHistory";

const MAX_USER_HISTORY_RECORDS = 40;

export class UserHistoryManager {
  static async addUser(
    userId: string,
    record: Omit<IUserRecord, "createdAt"> & { createdAt?: Date },
  ): Promise<void> {
    if (!userId) return;

    const history =
      (await UserHistory.findOne({ userId })) ||
      new UserHistory({ userId, records: [] });

    const normalizedRecord = {
      ...record,
      createdAt: record.createdAt ?? new Date(),
    };

    const alreadyExists = history.records.some(
      (r) =>
        r.username === normalizedRecord.username &&
        r.discriminator === normalizedRecord.discriminator &&
        r.avatarUrl === normalizedRecord.avatarUrl &&
        r.guildId === normalizedRecord.guildId &&
        r.source === normalizedRecord.source,
    );

    if (alreadyExists) return;

    history.records.unshift(normalizedRecord as IUserRecord);

    if (history.records.length > MAX_USER_HISTORY_RECORDS) {
      history.records = history.records.slice(0, MAX_USER_HISTORY_RECORDS);
    }

    history.updatedAt = new Date();
    await history.save();
  }

  static async getHistory(userId: string, guildId?: string) {
    const history = await UserHistory.findOne({ userId });
    const records = history?.records ?? [];
    if (!guildId) return records;
    return records.filter((record) => record.guildId === guildId);
  }
}
