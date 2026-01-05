import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStrike extends Document {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason?: string;
  points: number;
  createdAt: Date;
}

const strikeSchema = new Schema<IStrike>({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: 'Sin razón proporcionada' },
  points: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const Strike: Model<IStrike> = mongoose.models.Strike || mongoose.model<IStrike>('Strike', strikeSchema);

export default Strike;

// Helpers
export async function addStrike(guildId: string, userId: string, moderatorId: string, points = 1, reason?: string) {
  const s = new Strike({ guildId, userId, moderatorId, points, reason });
  await s.save();
  return s;
}

export async function getStrikesForUser(guildId: string, userId: string) {
  return Strike.find({ guildId, userId }).sort({ createdAt: -1 }).lean();
}

export async function getTotalPoints(guildId: string, userId: string) {
  const res = await Strike.aggregate([
    { $match: { guildId, userId } },
    { $group: { _id: null, total: { $sum: "$points" } } }
  ]);
  return res[0]?.total ?? 0;
}

export async function clearStrikesForUser(guildId: string, userId: string) {
  const res = await Strike.deleteMany({ guildId, userId });
  return res.deletedCount ?? 0;
}
