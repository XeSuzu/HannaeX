import { AvatarHistory } from "./userTracking.models";

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

    const alreadyExists = await AvatarHistory.exists({
      userId,
      guildId: options.guildId,
      "avatars.url": avatarUrl,
    });

    if (alreadyExists) return;

    const newAvatar = {
      url: avatarUrl,
      createdAt: new Date(),
      guildId: options.guildId,
      guildName: options.guildName ?? null,
      source: options.source ?? "guild",
    };

    await AvatarHistory.updateOne(
      { userId, guildId: options.guildId },
      {
        $push: {
          avatars: {
            $each: [newAvatar],
            $position: 0,
            $slice: MAX_AVATARS,
          },
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }

  static async getAvatars(userId: string, guildId: string) {
    const history = await AvatarHistory.findOne({ userId, guildId });
    return history?.avatars ?? [];
  }
}
