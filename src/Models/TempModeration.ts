import mongoose, { Document, Schema } from "mongoose";

export type TempModerationType = "ban" | "mute";
export type FailureCode = "MissingPermissions" | "UnknownRole" | "UnknownUser" | "RateLimited" | "UnknownGuild" | "Other";


export interface ITempModeration extends Document {
  guildId: string;
  userId: string;
  tipo: TempModerationType;
  expiresAt: Date;
  moderatorId: string;
  reason: string;
  roleId?: string;
  duration: string;
  attempts: number;
  nextAttemptAt?: Date;
  status: "pending" | "permanentFailure";
  failureCode?: FailureCode;
}

const tempModerationSchema = new Schema<ITempModeration>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    tipo: { type: String, enum: ["ban", "mute"], required: true },
    expiresAt: { type: Date, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    roleId: { type: String },
    // Preserve the duration text used by the existing expiration logs.
    duration: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date },
    status: { type: String, enum: ["pending", "permanentFailure"], default: "pending" },
    failureCode: { type: String, enum: ["MissingPermissions", "UnknownRole", "UnknownUser", "RateLimited", "UnknownGuild", "Other"] }
  },
  { timestamps: true },
);

tempModerationSchema.index(
  { guildId: 1, userId: 1, tipo: 1 },
  { unique: true },
);

const TempModeration: mongoose.Model<ITempModeration> =
  mongoose.models.TempModeration ||
  mongoose.model<ITempModeration>("TempModeration", tempModerationSchema);

export default TempModeration;
