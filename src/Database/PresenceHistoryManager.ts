import { ActivityType, Presence } from "discord.js";
import PresenceHistory, {
  IPresenceHistory,
  ISavedActivity,
} from "../Models/PresenceHistory";

export class PresenceHistoryManager {
  static async savePresence(
    userId: string,
    guildId: string,
    presence: Presence,
  ): Promise<void> {
    if (!userId || !guildId || !presence) return;

    const history =
      (await PresenceHistory.findOne({ userId, guildId })) ||
      new PresenceHistory({ userId, guildId, activities: [] });

    const activities = presence.activities.map((activity) => {
      const saved: ISavedActivity = {
        type: activity.type,
        name: activity.name ?? null,
        details: activity.details ?? null,
        state: activity.state ?? null,
        url: activity.url ?? null,
        timestamps: {
          start: activity.timestamps?.start
            ? new Date(activity.timestamps.start)
            : undefined,
          end: activity.timestamps?.end
            ? new Date(activity.timestamps.end)
            : undefined,
        },
        assets: {
          largeText: activity.assets?.largeText ?? null,
          smallText: activity.assets?.smallText ?? null,
        },
        emoji: activity.emoji?.name ?? null,
      };

      return saved;
    });

    const customActivity = presence.activities.find(
      (activity) => activity.type === ActivityType.Custom,
    );

    history.status = presence.status ?? "offline";
    history.activities = activities;
    history.customStatus = customActivity
      ? `${customActivity.emoji?.name ?? ""}${customActivity.state ? ` ${customActivity.state}` : ""}`.trim()
      : null;
    history.updatedAt = new Date();

    await history.save();
  }

  static async getPresence(
    userId: string,
    guildId: string,
  ): Promise<IPresenceHistory | null> {
    return PresenceHistory.findOne({ userId, guildId });
  }
}
