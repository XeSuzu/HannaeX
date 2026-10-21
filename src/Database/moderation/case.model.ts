import { Schema, model, Document } from "mongoose";

export type CaseAction =
  | "warn"
  | "timeout"
  | "kick"
  | "ban"
  | "unban"
  | "purge";

export type CaseSource = "manual" | "automod" | "ai" | "antiraid";

export interface ICase extends Document {
  caseId: number;
  guildId: string;
  userId: string;
  modId: string;
  action: CaseAction;
  reason: string;
  ruleId?: number | null;
  source: CaseSource;
  durationMs?: number | null;
  createdAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    caseId: { type: Number, required: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    modId: { type: String, required: true },
    action: {
      type: String,
      enum: ["warn", "timeout", "kick", "ban", "unban", "purge"],
      required: true,
    },
    reason: { type: String, required: true },
    ruleId: { type: Number, default: null },
    source: {
      type: String,
      enum: ["manual", "automod", "ai", "antiraid"],
      default: "automod",
    },
    durationMs: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

caseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

export const CaseModel = model<ICase>("Case", caseSchema);

export async function createCase(data: {
  guildId: string;
  userId: string;
  modId: string;
  action: CaseAction;
  reason: string;
  ruleId?: number | null;
  source?: CaseSource;
  durationMs?: number | null;
}): Promise<ICase> {
  const lastCase = await CaseModel.findOne({ guildId: data.guildId })
    .sort({ caseId: -1 })
    .select("caseId")
    .lean();

  const caseId = (lastCase?.caseId ?? 0) + 1;

  return CaseModel.create({
    ...data,
    caseId,
    source: data.source ?? "automod",
  });
}

export async function getCasesByUser(
  guildId: string,
  userId: string,
  limit = 10,
): Promise<ICase[]> {
  return CaseModel.find({ guildId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean() as unknown as ICase[];
}
