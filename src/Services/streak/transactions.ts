import mongoose, { ClientSession } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: TRANSACCIÓN CON RETRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envuelve cualquier operación en una sesión MongoDB con transacción.
 * Reintenta automáticamente hasta 3 veces en caso de WriteConflict
 * (puede ocurrir cuando dos usuarios del mismo grupo reclaman al mismo tiempo).
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

