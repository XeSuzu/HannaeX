// limpiar-historial.js

const mongoose = require('mongoose');
require('dotenv').config(); // Para cargar las variables de entorno (tu link a la DB)

// ¡MUY IMPORTANTE! Ajusta la ruta para que apunte a tu modelo de Mongoose
// donde guardas el historial de conversaciones.
const Conversation = require('../Database/conversation.js').model; // Asumo que exportas el modelo

async function limpiarBaseDeDatos() {
  if (!process.env.MONGO_URI) {
    console.error("❌ Error: No se encontró la variable MONGODB_URI en el archivo .env");
    return;
  }

  console.log("🟡 Conectando a la base de datos...");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a la base de datos.");

    console.log("🟡 Borrando todo el historial de conversaciones...");
    
    // Esta es la línea clave: deleteMany({}) borra todos los documentos de la colección.
    const resultado = await Conversation.deleteMany({});
    
    console.log(`✅ ¡Éxito! Se borraron ${resultado.deletedCount} registros del historial.`);

  } catch (error) {
    console.error("💥 Error durante el proceso de limpieza:", error);
  } finally {
    // Nos aseguramos de desconectar de la base de datos al finalizar
    await mongoose.disconnect();
    console.log("🔌 Desconectado de la base de datos.");
  }
}

// Ejecutar la función
limpiarBaseDeDatos();