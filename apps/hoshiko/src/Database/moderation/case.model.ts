import { Schema, model, models, Document } from "mongoose";
import { HoshikoLogger, LogLevel } from "../../Security/Logger/HoshikoLogger";

export type CaseAction =
  | "warn"
  | "timeout"
  | "kick"
  | "ban"
  | "unban"
  | "purge"
  | "unmute";

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
      enum: ["warn", "timeout", "kick", "ban", "unban", "purge", "unmute"],
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
caseSchema.index({ guildId: 1, userId: 1, createdAt: -1, caseId: -1 });
caseSchema.index({ guildId: 1, createdAt: -1, caseId: -1 });

export const CaseModel =
  (models.Case as import("mongoose").Model<ICase>) ||
  model<ICase>("Case", caseSchema);

export interface IGuildSequence extends Document {
  guildId: string;
  name: string;
  seq: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const guildSequenceSchema = new Schema<IGuildSequence>(
  {
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

guildSequenceSchema.index({ guildId: 1, name: 1 }, { unique: true });

export const GuildSequenceModel =
  (models.GuildSequence as import("mongoose").Model<IGuildSequence>) ||
  model<IGuildSequence>("GuildSequence", guildSequenceSchema);

export async function getNextCaseId(guildId: string): Promise<number> {
  // 1. Intentar incremento atómico directo si la secuencia ya existe
  let seqDoc = (await GuildSequenceModel.findOneAndUpdate(
    { guildId, name: "cases" },
    { $inc: { seq: 1 } },
    { new: true },
  )) as IGuildSequence | null;

  if (!seqDoc) {
    // 2. Si no existe secuencia previa para este servidor, inicializarla con el lastCase.caseId actual
    const lastCase = (await CaseModel.findOne({ guildId })
      .sort({ caseId: -1 })
      .select("caseId")
      .lean()) as ICase | null;

    const currentMax = lastCase?.caseId ?? 0;

    try {
      await GuildSequenceModel.findOneAndUpdate(
        { guildId, name: "cases" },
        { $setOnInsert: { seq: currentMax } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (err: any) {
      if (err?.code !== 11000 && !err?.message?.includes("E11000")) {
        throw err;
      }
    }

    seqDoc = (await GuildSequenceModel.findOneAndUpdate(
      { guildId, name: "cases" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )) as IGuildSequence | null;
  }

  return seqDoc?.seq ?? 1;
}

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
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const caseId = await getNextCaseId(data.guildId);

      return await CaseModel.create({
        ...data,
        caseId,
        source: data.source ?? "automod",
      });
    } catch (error: any) {
      lastError = error;
      const isCollision =
        error?.code === 11000 ||
        (typeof error?.message === "string" && error.message.includes("E11000"));

      if (isCollision && attempt < MAX_RETRIES) {
        // En caso de colisión accidental, resincronizar la secuencia al valor máximo real
        try {
          const highestCase = (await CaseModel.findOne({ guildId: data.guildId })
            .sort({ caseId: -1 })
            .select("caseId")
            .lean()) as ICase | null;
          if (highestCase?.caseId) {
            await GuildSequenceModel.updateOne(
              { guildId: data.guildId, name: "cases", seq: { $lt: highestCase.caseId } },
              { $set: { seq: highestCase.caseId } },
            );
          }
        } catch {
          // Continuar con el backoff
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
        continue;
      }

      break;
    }
  }

  // Si falló tras agotar los reintentos, emitir log estructurado de auditoría sin silenciar el error
  await HoshikoLogger.log({
    level: LogLevel.ERROR,
    context: "AUDIT_CASE_PERSISTENCE",
    message: `Fallo crítico de persistencia en moderación: no se pudo registrar caso para usuario ${data.userId} en servidor ${data.guildId}. Acción: ${data.action}, Razón: ${data.reason}. Error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    guildId: data.guildId,
    userId: data.userId,
    metadata: {
      action: data.action,
      modId: data.modId,
      reason: data.reason,
      ruleId: data.ruleId,
      source: data.source,
      durationMs: data.durationMs,
      error: lastError instanceof Error ? lastError.stack : String(lastError),
    },
  }).catch(() => null);

  throw lastError;
}

export async function getCasesByUser(
  guildId: string,
  userId: string,
  limit = 10,
): Promise<ICase[]> {
  return CaseModel.find({ guildId, userId })
    .sort({ createdAt: -1, caseId: -1 })
    .limit(limit)
    .lean() as unknown as ICase[];
}

export async function getCaseById(
  guildId: string,
  caseId: number,
): Promise<ICase | null> {
  return CaseModel.findOne({ guildId, caseId }).lean() as unknown as ICase | null;
}

export async function getRecentCases(
  guildId: string,
  limit = 10,
): Promise<ICase[]> {
  return CaseModel.find({ guildId })
    .sort({ createdAt: -1, caseId: -1 })
    .limit(limit)
    .lean() as unknown as ICase[];
}
