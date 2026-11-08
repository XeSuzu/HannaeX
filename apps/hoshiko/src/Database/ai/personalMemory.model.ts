import mongoose, { Document, Schema, Model } from "mongoose";
import { FieldEncryptionService } from "../../Security/Encryption/FieldEncryptionService";

export interface IPersonalFact {
  id: string;
  category: "preference" | "biography" | "project" | "boundary" | "dynamic" | "custom";
  fact: string;
  source: "explicit" | "auto_extracted" | "legacy_migrated_confirmed";
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
      enum: ["preference", "biography", "project", "boundary", "dynamic", "custom"],
      default: "custom",
    },
    fact: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1500,
      set: (v: string) => FieldEncryptionService.encrypt(v),
      get: (v: string) => FieldEncryptionService.decrypt(v),
    },
    source: {
      type: String,
      enum: ["explicit", "auto_extracted", "legacy_migrated_confirmed"],
      required: true,
    },
    confidence: { type: Number, default: 1.0, min: 0.0, max: 1.0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } },
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
  { timestamps: true, bufferCommands: false, toJSON: { getters: true }, toObject: { getters: true } },
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
