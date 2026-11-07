import { ActivityType } from "discord.js";
import { Document, Model, Schema, model, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface IAvatarRecord {
  url: string;
  createdAt: Date;
  guildId: string;
  guildName?: string | null;
  source: "guild" | "message" | "command";
}

export interface IAvatarHistory extends Document {
  userId: string;
  guildId: string;
  avatars: IAvatarRecord[];
  updatedAt: Date;
}

const AvatarRecordSchema = new Schema<IAvatarRecord>({
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  guildId: { type: String, required: true },
  guildName: { type: String, default: null },
  source: {
    type: String,
    enum: ["guild", "message", "command"],
    default: "guild",
  },
});

const AvatarHistorySchema = new Schema<IAvatarHistory>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  avatars: { type: [AvatarRecordSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

AvatarHistorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const AvatarHistory: Model<IAvatarHistory> =
  (models.AvatarHistory as Model<IAvatarHistory>) ||
  model<IAvatarHistory>("AvatarHistory", AvatarHistorySchema);

// ─────────────────────────────────────────────────────────────────────────────
// USER HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface IUserRecord {
  username: string;
  discriminator: string;
  tag: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  source: "global" | "guild" | "member" | "command";
  createdAt: Date;
}

export interface IUserHistory extends Document {
  userId: string;
  records: IUserRecord[];
  updatedAt: Date;
}

const UserRecordSchema = new Schema<IUserRecord>({
  username: { type: String, required: true },
  discriminator: { type: String, required: true },
  tag: { type: String, required: true },
  displayName: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  bannerUrl: { type: String, default: null },
  guildId: { type: String, default: null },
  guildName: { type: String, default: null },
  source: {
    type: String,
    enum: ["global", "guild", "member", "command"],
    default: "global",
  },
  createdAt: { type: Date, default: Date.now },
});

const UserHistorySchema = new Schema<IUserHistory>({
  userId: { type: String, required: true, unique: true },
  records: { type: [UserRecordSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export const UserHistory: Model<IUserHistory> =
  (models.UserHistory as Model<IUserHistory>) ||
  model<IUserHistory>("UserHistory", UserHistorySchema);

// ─────────────────────────────────────────────────────────────────────────────
// PRESENCE HISTORY
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── índice compuesto — evita full collection scan en getPresence ─────────────
PresenceHistorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const PresenceHistory: Model<IPresenceHistory> =
  (models.PresenceHistory as Model<IPresenceHistory>) ||
  model<IPresenceHistory>("PresenceHistory", PresenceHistorySchema);
