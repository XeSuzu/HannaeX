import AvatarHistory from "../Models/AvatarHistory";

const MAX_AVATARS = 30;

export class AvatarHistoryManager {
  static async addAvatar(
    userId: string,
    avatarUrl: string,
    options: {
      guildId: string;
      guildName?: string | null;
      source?: "guild" | "message" | "command";
    },
  ): Promise<void> {
    if (!avatarUrl || !options.guildId) return;

    const history =
      (await AvatarHistory.findOne({
        userId,
        guildId: options.guildId,
      })) ||
      new AvatarHistory({
        userId,
        guildId: options.guildId,
        avatars: [],
      });

    const alreadyExists = history.avatars.some(
      (record) => record.url === avatarUrl,
    );
    if (alreadyExists) return;

    history.avatars.unshift({
      url: avatarUrl,
      createdAt: new Date(),
      guildId: options.guildId,
      guildName: options.guildName ?? null,
      source: options.source ?? "guild",
    });

    if (history.avatars.length > MAX_AVATARS) {
      history.avatars = history.avatars.slice(0, MAX_AVATARS);
    }

    history.updatedAt = new Date();
    await history.save();
  }

  static async getAvatars(userId: string, guildId: string) {
    const history = await AvatarHistory.findOne({ userId, guildId });
    return history?.avatars ?? [];
  }
}
