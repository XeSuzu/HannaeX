import { Schema, model, models } from "mongoose";

const GlobalBlacklistSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, default: "Amenaza detectada por Sentinel Network" },
  severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "HIGH" },
  addedAt: { type: Date, default: Date.now },
});

export const GlobalBlacklist =
  models.GlobalBlacklist || model("GlobalBlacklist", GlobalBlacklistSchema);

export default GlobalBlacklist;
