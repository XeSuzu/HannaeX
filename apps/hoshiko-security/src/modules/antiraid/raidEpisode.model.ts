import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRaidEpisodeSuspect {
  id: string;
  username: string;
  accountAgeDays: number;
  joinedSecondsAgo: number;
}

export interface IRaidEpisode extends Document {
  episodeId: string;
  guildId: string;
  startTime: number;
  lastSuspectTime: number;
  suspects: IRaidEpisodeSuspect[];
  suspectIds?: string[];
  recommendation?: string;
  commonMetadata?: any;
  status?: string;
  appliedAction?: "ban" | "timeout" | "none";
  appliedBy?: string;
  appliedAt?: Date;
  revertedBy?: string;
  revertedAt?: Date;
  actionTaken?: "ban" | "timeout" | "none";
  actionExpiresAt?: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RaidEpisodeSuspectSchema = new Schema<IRaidEpisodeSuspect>(
  {
    id: { type: String, required: true },
    username: { type: String, required: true },
    accountAgeDays: { type: Number, required: true },
    joinedSecondsAgo: { type: Number, required: true },
  },
  { _id: false },
);

const RaidEpisodeSchema = new Schema<IRaidEpisode>(
  {
    episodeId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    startTime: { type: Number, required: true, default: () => Date.now() },
    lastSuspectTime: { type: Number, required: true, default: () => Date.now() },
    suspects: { type: [RaidEpisodeSuspectSchema], default: [] },
    suspectIds: { type: [String], default: [] },
    recommendation: { type: String },
    commonMetadata: { type: Schema.Types.Mixed },
    status: { type: String, default: "active" },
    appliedAction: { type: String },
    appliedBy: { type: String },
    appliedAt: { type: Date },
    revertedBy: { type: String },
    revertedAt: { type: Date },
    actionTaken: {
      type: String,
      enum: ["ban", "timeout", "none"],
      default: "none",
    },
    actionExpiresAt: { type: Number },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Number },
    resolvedBy: { type: String },
  },
  {
    timestamps: true,
  },
);

export const RaidEpisodeModel: Model<IRaidEpisode> =
  mongoose.models.RaidEpisode ||
  mongoose.model<IRaidEpisode>("RaidEpisode", RaidEpisodeSchema);
