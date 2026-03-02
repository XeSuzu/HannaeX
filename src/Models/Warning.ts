import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWarning extends Document {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  type: "warn" | "mute" | "kick" | "ban";
  executedBy: "system" | string; // "system" = automod, userId = mod manual
  createdAt: Date;
}

const warningSchema = new Schema<IWarning>(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: "Sin motivo especificado." },
    type: {
      type: String,
      enum: ["warn", "mute", "kick", "ban"],
      default: "warn",
    },
    executedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

const Warning: Model<IWarning> =
  mongoose.models.Warning ||
  mongoose.model<IWarning>("Warning", warningSchema);

export default Warning;

export async function addWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string,
  type: IWarning["type"] = "warn",
  executedBy: string = "system"
): Promise<IWarning> {
  const warning = new Warning({ guildId, userId, moderatorId, reason, type, executedBy });
  await warning.save();
  return warning;
}

export async function getWarnings(
  guildId: string,
  userId: string
): Promise<IWarning[]> {
  const results = await Warning.find({ guildId, userId }).sort({ createdAt: -1 }).lean();
  return results as unknown as IWarning[];
}

export async function deleteWarning(
  guildId: string,
  warningId: string
): Promise<boolean> {
  const res = await Warning.deleteOne({ _id: warningId, guildId });
  return res.deletedCount > 0;
}

export async function clearWarnings(
  guildId: string,
  userId: string
): Promise<number> {
  const res = await Warning.deleteMany({ guildId, userId });
  return res.deletedCount ?? 0;
}