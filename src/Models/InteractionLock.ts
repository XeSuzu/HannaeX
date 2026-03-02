import { Schema, model } from 'mongoose';

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
    expires: '15s',
    default: Date.now,
  },
});

export const InteractionLock = model('InteractionLock', interactionLockSchema);