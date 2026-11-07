import mongoose from "mongoose";
import { AppConfig } from "../App/config/AppConfig";

export type MongoStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "degraded"
  | "closed";

let mongoStatus: MongoStatus = "disconnected";
let connectPromise: Promise<void> | null = null;
let disconnectPromise: Promise<void> | null = null;

function getMongoUri(): string {
  const mongoUri = AppConfig.get().MONGO_URI;
  if (!mongoUri || mongoUri.trim().length === 0) {
    throw new Error("MONGO_URI missing");
  }

  return mongoUri;
}

function getConnectOptions(): mongoose.ConnectOptions {
  return {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
  };
}

export function getMongoStatus(): MongoStatus {
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    return "connected";
  }

  if (mongoose.connection.readyState === mongoose.STATES.connecting) {
    return "connecting";
  }

  if (mongoose.connection.readyState === mongoose.STATES.disconnected) {
    return "disconnected";
  }

  return mongoStatus;
}

export async function connectWithRetry(
  retries = 6,
  delayMs = 5000,
): Promise<void> {
  if (disconnectPromise) {
    await disconnectPromise;
  }

  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    mongoStatus = "connected";
    return;
  }

  if (connectPromise) {
    await connectPromise;
    return;
  }

  const mongoUri = getMongoUri();

  const connectionAttempt = (async () => {
    mongoose.set("strictQuery", true);

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      mongoStatus = "connecting";

      try {
        console.log(`[Mongo] Attempt ${attempt}/${retries} to connect`);
        await mongoose.connect(mongoUri, getConnectOptions());
        mongoStatus = "connected";
        console.log("[Mongo] Connected successfully.");
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "mongo_connect_failed";
        console.warn(
          `[Mongo] connection attempt ${attempt}/${retries} failed: ${message}`,
        );

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        mongoStatus = "degraded";
        throw error;
      }
    }
  })();
  connectPromise = connectionAttempt;

  try {
    await connectionAttempt;
  } finally {
    if (connectPromise === connectionAttempt) {
      connectPromise = null;
    }
    const state = mongoose.connection.readyState as number;
    if (state !== mongoose.STATES.connected) {
      mongoStatus = "degraded";
    }
  }
}

export async function disconnectMongo(): Promise<void> {
  if (disconnectPromise) {
    return disconnectPromise;
  }

  const pendingConnection = connectPromise;
  const activeDisconnect = (async () => {
    if (pendingConnection) {
      await pendingConnection.catch(() => undefined);
    }

    if (mongoose.connection.readyState === mongoose.STATES.disconnected) {
      mongoStatus = "closed";
      return;
    }

    try {
      await mongoose.disconnect();
      mongoStatus = "closed";
      console.log("[Mongo] Disconnected successfully.");
    } catch (error) {
      mongoStatus = "degraded";
      console.error("[Mongo] Error on disconnect:", error);
    }
  })();
  disconnectPromise = activeDisconnect;

  try {
    await activeDisconnect;
  } finally {
    if (disconnectPromise === activeDisconnect) {
      disconnectPromise = null;
    }
    if (connectPromise === pendingConnection) {
      connectPromise = null;
    }
  }
}
