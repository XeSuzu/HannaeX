import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPersonalFact {
  id: string;
  category: "preference" | "biography" | "project" | "boundary" | "custom";
  fact: string;
  source: "explicit" | "legacy_migrated_confirmed";
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPreferences {
  style: "concise" | "balanced" | "detailed";
  tonePreference: "default" | "playful" | "serene";
  allowVisuals: boolean;
}

export interface IPersonalMemory extends Document {
  userId: string;
  enabled: boolean;
  facts: IPersonalFact[];
  preferences: IUserPreferences;
  retentionDays: number;
  lastInteraction: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalFactSchema = new Schema<IPersonalFact>(
  {
    id: { type: String, required: true },
    category: {
      type: String,
      enum: ["preference", "biography", "project", "boundary", "custom"],
      default: "custom",
    },
    fact: { type: String, required: true, trim: true, minlength: 5, maxlength: 140 },
    source: {
      type: String,
      enum: ["explicit", "legacy_migrated_confirmed"],
      required: true,
    },
    confidence: { type: Number, default: 1.0, min: 0.0, max: 1.0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    style: {
      type: String,
      enum: ["concise", "balanced", "detailed"],
      default: "balanced",
    },
    tonePreference: {
      type: String,
      enum: ["default", "playful", "serene"],
      default: "default",
    },
    allowVisuals: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const PersonalMemorySchema = new Schema<IPersonalMemory>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true, index: true },
    facts: { type: [PersonalFactSchema], default: [] },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({
        style: "balanced",
        tonePreference: "default",
        allowVisuals: true,
      }),
    },
    retentionDays: { type: Number, default: 0 },
    lastInteraction: { type: Date, default: Date.now },
  },
  { timestamps: true, bufferCommands: false },
);

// Índice TTL parcial opcional para usuarios que elijan retención de 90 días
PersonalMemorySchema.index(
  { lastInteraction: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { retentionDays: 90 } },
);

export const PersonalMemory: Model<IPersonalMemory> =
  mongoose.models.PersonalMemory ||
  mongoose.model<IPersonalMemory>("PersonalMemory", PersonalMemorySchema);

export default PersonalMemory;
