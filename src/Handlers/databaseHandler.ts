import mongoose from "mongoose";
import { connectWithRetry } from "../Services/mongo";

let isConnecting = false;

/**
 * Initializes the Hoshiko database connection.
 */
export default async function initDatabase() {
  if (isConnecting) return;

  // If already connected, no need to retry
  if (mongoose.connection.readyState === 1) return;

  isConnecting = true;

  if (!process.env.MONGO_URI) {
    console.error(
      "CRITICAL ERROR: MONGO_URI environment variable is missing",
    );
    return process.exit(1);
  }

  // Mongoose configuration
  mongoose.set("strictQuery", true);

  // Connection event monitoring
  mongoose.connection.on("connected", () => {
    console.log("MongoDB: Connection established.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB: Connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB: Connection lost. Attempting to reconnect...");
  });

  console.log("Starting MongoDB connection process...");

  try {
    await connectWithRetry();
  } catch (err) {
    console.error("Failed to establish initial connection:", err);
  } finally {
    isConnecting = false;
  }
}
