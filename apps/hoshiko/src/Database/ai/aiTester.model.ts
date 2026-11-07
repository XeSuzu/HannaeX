import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAiTester extends Document {
  guildId: string;
  userId: string;
  invitedBy: string;
  createdAt: Date;
}

const AiTesterSchema = new Schema<IAiTester>(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    invitedBy: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "aitesters",
    bufferCommands: false,
  },
);

AiTesterSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const AiTester: Model<IAiTester> =
  mongoose.models.AiTester || mongoose.model<IAiTester>("AiTester", AiTesterSchema);

export default AiTester;
