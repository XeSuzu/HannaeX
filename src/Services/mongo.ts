import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
let connected = false;

export async function connectWithRetry(retries = 6, delayMs = 5000) {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI no definida. Configura el secreto en Secret Manager o env vars.");
    throw new Error("MONGO_URI missing");
  }

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Mongo] Intentando conectar (attempt ${i + 1}/${retries})...`);
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        // otras opciones si hace falta
      } as mongoose.ConnectOptions);
      connected = true;
      console.log("[Mongo] Conectado a MongoDB ✅");
      return;
    } catch (err: any) {
      console.error(`[Mongo] Error al conectar (attempt ${i + 1}):`, err?.message || err);
      if (i < retries - 1) {
        console.log(`[Mongo] Reintentando en ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.error("[Mongo] No se pudo conectar tras varios intentos.");
        throw err;
      }
    }
  }
}

export async function disconnect() {
  if (!connected) return;
  try {
    await mongoose.disconnect();
    connected = false;
    console.log("[Mongo] Desconectado correctamente.");
  } catch (err) {
    console.error("[Mongo] Error al desconectar:", err);
  }
}