import mongoose from 'mongoose';
import { connectWithRetry } from '../Services/mongo';

let isConnecting = false;

/**
 * Inicializa la conexión a la base de datos de Hoshiko 🌸
 */
export default async function initDatabase() {
  if (isConnecting) return;
  
  // Si ya estamos conectados, no hace falta intentarlo de nuevo ✨
  if (mongoose.connection.readyState === 1) return;

  isConnecting = true;

  if (!process.env.MONGO_URI) {
    console.error("❌ ERROR CRÍTICO: Falta la variable MONGO_URI en el archivo .env");
    return process.exit(1);
  }

  // --- Configuraciones de Mongoose ---
  mongoose.set('strictQuery', true); // Para evitar advertencias de versiones futuras ✨

  // --- Eventos de Monitoreo ---
  mongoose.connection.on('connected', () => {
    console.log("🍃 MongoDB: Conexión establecida.");
  });

  mongoose.connection.on('error', (err) => {
    console.error("🍂 MongoDB: Error de conexión:", err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn("⚠️ MongoDB: Conexión perdida. Intentando reconectar...");
  });

  console.log('🔍 Iniciando proceso de conexión a MongoDB...');

  try {
    await connectWithRetry();
    // Nota: El log de éxito ya lo manejas con el evento 'connected' o aquí mismo
  } catch (err) {
    console.error("❌ No se pudo establecer la conexión inicial:", err);
    // Dependiendo de tu bot, podrías querer cerrar el proceso aquí o dejar que reintente
  } finally {
    isConnecting = false;
  }
}