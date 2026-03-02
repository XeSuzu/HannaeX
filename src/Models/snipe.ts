// src/Models/Snipe.ts
import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFAZ
// ─────────────────────────────────────────────────────────────────────────────

export interface ISnipeEntry {
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  image: string | null;
  deletedAt: Date;
}

export interface ISnipe extends Document {
  channelId: string;
  guildId: string;
  snipes: ISnipeEntry[];
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const SnipeEntrySchema = new Schema<ISnipeEntry>(
  {
    content:      { type: String, required: true },
    author:       { type: String, required: true },
    authorId:     { type: String, required: true },
    authorAvatar: { type: String, required: true },
    image:        { type: String, default: null },
    deletedAt:    { type: Date,   default: Date.now },
  },
  { _id: false }
);

const SnipeSchema = new Schema<ISnipe>(
  {
    channelId: { type: String, required: true, unique: true },
    guildId:   { type: String, required: true },
    snipes:    { type: [SnipeEntrySchema], default: [] },
  },
  {
    timestamps: true,
    collection: "snipes",
  }
);

// TTL: el documento se borra automáticamente 1 hora después de updatedAt
// MongoDB lo revisa cada 60 segundos
SnipeSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 3600, name: "idx_snipe_ttl" }
);

// Query rápida por canal
SnipeSchema.index({ channelId: 1 }, { name: "idx_snipe_channel" });

export const Snipe = model<ISnipe>("Snipe", SnipeSchema);