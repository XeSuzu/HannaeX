import mongoose from "mongoose";

// const MONGO_URI = process.env.MONGO_URI;
let connected = false;

// 1. LISTENERS GLOBALES (Ojos que vigilan la conexión 24/7)
mongoose.connection.on("disconnected", () => {
  console.warn(
    "⚠️ [Mongo] Se perdió la conexión. Reintentando internamente...",
  );
  connected = false;
});

mongoose.connection.on("reconnected", () => {
  console.log("♻️ [Mongo] ¡Conexión recuperada exitosamente!");
  connected = true;
});

export async function connectWithRetry(retries = 6, delayMs = 5000) {
 const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI no definida. Revisa tu archivo .env");
    throw new Error("MONGO_URI missing");
  }

  // Si ya está conectado (readyState 1), no hacemos nada
  if (mongoose.connection.readyState === 1) return;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(
        `[Mongo] Intentando conectar (intento ${i + 1}/${retries})...`,
      );

      // 2. CONFIGURACIÓN BLINDADA 🛡️
      await mongoose.connect(MONGO_URI, {
        // Rendimiento: Permite hasta 10 operaciones simultáneas (Turbo)
        maxPoolSize: 10,

        // Estabilidad: Espera 30s antes de rendirse por lag
        serverSelectionTimeoutMS: 30000,

        // Mantener viva la conexión
        socketTimeoutMS: 45000,

        // Compatibilidad: Fuerza IPv4 (Evita errores raros en algunos VPS)
        family: 4,
      } as mongoose.ConnectOptions);

      connected = true;
      console.log("🍃 [Mongo] Conectado a MongoDB (Modo Optimizado) ✅");
      return;
    } catch (err: any) {
      console.error(`[Mongo] Falló el intento ${i + 1}:`, err?.message || err);

      if (i < retries - 1) {
        console.log(`[Mongo] Reintentando en ${delayMs / 1000} segundos...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error(
          "❌ [Mongo] No se pudo conectar tras varios intentos. Apagando.",
        );
        throw err; // El Anti-Crash atrapará esto si decides no salir, o el proceso morirá.
      }
    }
  }
}

export async function disconnect() {
  try {
    await mongoose.disconnect();
    connected = false;
    console.log("[Mongo] Desconectado correctamente. 👋");
  } catch (err) {
    console.error("[Mongo] Error al desconectar:", err);
  }
}
