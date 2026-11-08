import mongoose, { Document, Schema, Model } from "mongoose";
import { FieldEncryptionService } from "../../Security/Encryption/FieldEncryptionService";

export interface IMemoryFact {
  fact: string;
  createdAt: Date;
}

export interface IUserMemory extends Document {
  userId: string;
  guildId: string;
  facts: IMemoryFact[];
  updatedAt: Date;
}

const MemoryFactSchema = new Schema<IMemoryFact>(
  {
    fact: {
      type: String,
      required: true,
      set: (v: string) => FieldEncryptionService.encrypt(v),
      get: (v: string) => FieldEncryptionService.decrypt(v),
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } },
);

const UserMemorySchema = new Schema<IUserMemory>(
  {
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    facts: { type: [MemoryFactSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { toJSON: { getters: true }, toObject: { getters: true } },
);

// Índice compuesto para buscar rápido por usuario + servidor
UserMemorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const UserMemory: Model<IUserMemory> =
  mongoose.models.UserMemory ||
  mongoose.model<IUserMemory>("UserMemory", UserMemorySchema);

export default UserMemory;
