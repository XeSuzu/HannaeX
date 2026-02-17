import mongoose, { Schema, Document, Model } from "mongoose";

export interface IServerSettings extends Document {
  guildId: string;
  strikeMuteThreshold?: number | null;
  strikeBanThreshold?: number | null;
  strikeMuteDurationMs?: number | null;
  modLogChannelId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const serverSettingsSchema = new Schema<IServerSettings>(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    strikeMuteThreshold: { type: Number, default: null },
    strikeBanThreshold: { type: Number, default: null },
    strikeMuteDurationMs: { type: Number, default: null },
    modLogChannelId: { type: String, default: null },
  },
  { timestamps: true },
);

const ServerSettings: Model<IServerSettings> =
  mongoose.models.ServerSettings ||
  mongoose.model<IServerSettings>("ServerSettings", serverSettingsSchema);

export default ServerSettings;

export async function getServerSettings(
  guildId: string,
): Promise<IServerSettings | null> {
  try {
    return (await ServerSettings.findOne({
      guildId,
    }).lean()) as IServerSettings | null;
  } catch (err) {
    console.error("[ServerSettings] get error:", err);
    return null;
  }
}

export async function upsertServerSettings(
  guildId: string,
  patch: Partial<IServerSettings>,
) {
  try {
    const updated = await ServerSettings.findOneAndUpdate(
      { guildId },
      { $set: { ...patch, guildId } },
      { new: true, upsert: true },
    );
    return updated;
  } catch (err) {
    console.error("[ServerSettings] upsert error:", err);
    throw err;
  }
}
