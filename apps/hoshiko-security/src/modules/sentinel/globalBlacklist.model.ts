import mongoose, { Schema, Document } from "mongoose";

export interface IGlobalBlacklist extends Document {
  userId: string;
  reason: string;
  addedAt: Date;
}

const GlobalBlacklistSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

export default mongoose.models.GlobalBlacklist ||
  mongoose.model<IGlobalBlacklist>("GlobalBlacklist", GlobalBlacklistSchema);
