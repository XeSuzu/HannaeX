import mongoose from 'mongoose';
import { connectWithRetry } from '../Services/mongo';

export default async function initDatabase() {
  if (!process.env.MONGO_URI) {
    console.error("❌ Error: Falta la variable MONGO_URI en el archivo .env");
    return process.exit(1);
  }

  console.log('🔍 Intentando conectar a MongoDB...');

  try {
    await connectWithRetry();
    console.log("✅ ¡Base de datos conectada con éxito!");
  } catch (err) {
    // No hacemos process.exit aquí: Cloud Run / entorno orquestador se encargará de reinicios.
    console.error("❌ Error inicializando la base de datos (seguir arrancando en modo degradado):", err);
    // Opcional: lanzar telemetry / alert here
  }
}