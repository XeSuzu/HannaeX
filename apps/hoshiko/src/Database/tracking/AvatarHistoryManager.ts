import { AvatarHistory } from "./userTracking.models";
import { TrackingOptOutManager } from "./TrackingOptOutManager";

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

    // Respetar oposición de privacidad (Opt-out)
    if (await TrackingOptOutManager.isOptedOut(userId)) {
      return;
    }

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

  static async deleteAvatars(userId: string, guildId?: string): Promise<number> {
    if (!userId) return 0;
    const filter: Record<string, string> = { userId };
    if (guildId) filter.guildId = guildId;
    const res = await AvatarHistory.deleteMany(filter);
    return res.deletedCount || 0;
  }
}
