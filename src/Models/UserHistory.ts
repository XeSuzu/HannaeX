import mongoose, { Document, Schema } from "mongoose";

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

UserHistorySchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<IUserHistory>("UserHistory", UserHistorySchema);
