import { Document, Model, Schema, model } from "mongoose";

export type KeywordCategory =
  | "anime"
  | "gaming"
  | "sports"
  | "economy"
  | "tech"
  | "news"
  | "general"
  | "music";

export interface IDynamicKeyword extends Document {
  keyword: string;
  category: KeywordCategory;
  hits: number;
  source: "auto_discovered" | "manual";
  status: "active" | "quarantine" | "blocked";
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DynamicKeywordSchema = new Schema<IDynamicKeyword>(
  {
    keyword: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["anime", "gaming", "sports", "economy", "tech", "news", "general", "music"],
      default: "general",
    },
    hits: {
      type: Number,
      default: 1,
      min: 1,
    },
    source: {
      type: String,
      enum: ["auto_discovered", "manual"],
      default: "auto_discovered",
    },
    status: {
      type: String,
      enum: ["active", "quarantine", "blocked"],
      default: "active",
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "dynamic_keywords",
  },
);

export const DynamicKeyword: Model<IDynamicKeyword> =
  model<IDynamicKeyword>("DynamicKeyword", DynamicKeywordSchema);
