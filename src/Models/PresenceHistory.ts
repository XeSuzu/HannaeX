import { ActivityType } from "discord.js";
import { Document, Schema, model, models } from "mongoose";

export interface ISavedActivity {
  type: ActivityType;
  name?: string | null;
  details?: string | null;
  state?: string | null;
  url?: string | null;
  timestamps?: {
    start?: Date;
    end?: Date;
  };
  assets?: {
    largeText?: string | null;
    smallText?: string | null;
  };
  emoji?: string | null;
}

export interface IPresenceHistory extends Document {
  userId: string;
  guildId: string;
  status: string;
  activities: ISavedActivity[];
  customStatus?: string | null;
  updatedAt: Date;
}

const SavedActivitySchema = new Schema<ISavedActivity>(
  {
    type: { type: Number, required: true },
    name: { type: String, default: null },
    details: { type: String, default: null },
    state: { type: String, default: null },
    url: { type: String, default: null },
    timestamps: {
      start: { type: Date, default: null },
      end: { type: Date, default: null },
    },
    assets: {
      largeText: { type: String, default: null },
      smallText: { type: String, default: null },
    },
    emoji: { type: String, default: null },
  },
  { _id: false },
);

const PresenceHistorySchema = new Schema<IPresenceHistory>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  status: { type: String, required: true },
  activities: { type: [SavedActivitySchema], default: [] },
  customStatus: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

export default models.PresenceHistory ||
  model<IPresenceHistory>("PresenceHistory", PresenceHistorySchema);
