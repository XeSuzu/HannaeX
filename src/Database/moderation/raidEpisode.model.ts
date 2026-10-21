import { Schema, model, Document } from "mongoose";

export interface IRaidEpisode extends Document {
  episodeId: string;
  guildId: string;
  suspectIds: string[];
  commonMetadata: {
    accountAgeAvgDays?: number;
    sharedPattern?: string;
    detectedInvite?: string;
    sampleText?: string;
  };
  recommendation: string;
  status: "active" | "applied" | "reverted";
  appliedAction?: "timeout" | "ban" | "none";
  appliedBy?: string;
  appliedAt?: Date;
  revertedBy?: string;
  revertedAt?: Date;
  channelId?: string;
  messageId?: string;
  createdAt: Date;
}

const raidEpisodeSchema = new Schema<IRaidEpisode>(
  {
    episodeId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    suspectIds: { type: [String], default: [] },
    commonMetadata: {
      accountAgeAvgDays: { type: Number, default: 0 },
      sharedPattern: { type: String, default: "" },
      detectedInvite: { type: String, default: null },
      sampleText: { type: String, default: null },
    },
    recommendation: { type: String, default: "Revisar lista de cuentas" },
    status: {
      type: String,
      enum: ["active", "applied", "reverted"],
      default: "active",
      index: true,
    },
    appliedAction: {
      type: String,
      enum: ["timeout", "ban", "none"],
      default: "none",
    },
    appliedBy: { type: String, default: null },
    appliedAt: { type: Date, default: null },
    revertedBy: { type: String, default: null },
    revertedAt: { type: Date, default: null },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

raidEpisodeSchema.index({ guildId: 1, createdAt: -1 });

export const RaidEpisodeModel = model<IRaidEpisode>(
  "RaidEpisode",
  raidEpisodeSchema,
);
