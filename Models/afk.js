const { Schema, model, models } = require("mongoose");

const afkSchema = new Schema({
  // CAMBIO: Le quitamos el 'unique: true' de aquí.
  userId: { type: String, required: true },

  // AÑADIDO: Guardamos el ID del servidor. ¡Esto es súper importante!
  guildId: { type: String, required: true },
  
  reason: { type: String, default: "AFK 🐾" }, // Tu razón por defecto está perfecta :)
  timestamp: { type: Date, default: Date.now },
});

// AÑADIDO: Esta es la nueva forma de asegurar que sea único.
// Le decimos a la base de datos: "La combinación del ID de usuario y el ID del servidor debe ser única".
// Esto permite que un mismo usuario esté AFK en múltiples servidores a la vez.
afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });


module.exports = models.AFK || model("AFK", afkSchema);