import { Model, Schema, model, models } from "mongoose";

/**
 * Schema for creating a distributed lock on an interaction to prevent
 * duplicate processing in a clustered environment.
 */
const interactionLockSchema = new Schema({
  // The unique ID of the interaction serves as the document's primary key.
  _id: {
    type: String,
    required: true,
  },
  // A TTL index will automatically delete the document after 15 seconds.
  // This prevents stale locks in case of a process crash.
  createdAt: {
    type: Date,
    expires: "15s",
    default: Date.now,
  },
});

export const InteractionLock =
  models.InteractionLock || model("InteractionLock", interactionLockSchema);

export interface ITester {
  userId: string;
  addedBy: string;
  date: Date;
}

const TesterSchema = new Schema<ITester>({
  userId: { type: String, required: true, unique: true },
  addedBy: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export const Tester: Model<ITester> =
  (models.Tester as Model<ITester>) || model<ITester>("Tester", TesterSchema);

export default Tester;
