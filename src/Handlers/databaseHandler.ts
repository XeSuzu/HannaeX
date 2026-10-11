import { connectWithRetry, disconnectMongo, getMongoStatus } from "../Services/mongo";

/**
 * Legacy compatibility entrypoint kept for older imports.
 * The real Mongo policy now lives in src/Services/mongo.ts.
 */
export default async function initDatabase(): Promise<string> {
  await connectWithRetry();
  return getMongoStatus();
}

export { connectWithRetry, disconnectMongo, getMongoStatus };
