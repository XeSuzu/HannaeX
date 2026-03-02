import mongoose, { Document, Schema } from "mongoose";

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

const MemoryFactSchema = new Schema<IMemoryFact>({
  fact: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserMemorySchema = new Schema<IUserMemory>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  facts: { type: [MemoryFactSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

// Índice compuesto para buscar rápido por usuario + servidor
UserMemorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model<IUserMemory>("UserMemory", UserMemorySchema);