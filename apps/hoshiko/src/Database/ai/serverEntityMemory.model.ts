import mongoose, { Document, Schema, Model } from "mongoose";

export interface IServerEntityMemory extends Document {
  guildId: string;
  entity: string;
  entityNormalized: string;
  fact: string;
  sourceUserId: string;
  sourceUsername: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServerEntityMemorySchema = new Schema<IServerEntityMemory>(
  {
    guildId: { type: String, required: true },
    entity: { type: String, required: true, trim: true, maxlength: 60 },
    entityNormalized: { type: String, required: true, trim: true, lowercase: true },
    fact: { type: String, required: true, trim: true, maxlength: 200 },
    sourceUserId: { type: String, required: true },
    sourceUsername: { type: String, default: "Alguien del servidor" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ServerEntityMemorySchema.index({ guildId: 1, entityNormalized: 1 });

export const ServerEntityMemory: Model<IServerEntityMemory> =
  mongoose.models.ServerEntityMemory ||
  mongoose.model<IServerEntityMemory>("ServerEntityMemory", ServerEntityMemorySchema);

export default ServerEntityMemory;
