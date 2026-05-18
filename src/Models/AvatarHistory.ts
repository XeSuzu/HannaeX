import mongoose, { Document, Schema } from "mongoose";

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

export default mongoose.model<IAvatarHistory>(
  "AvatarHistory",
  AvatarHistorySchema,
);
