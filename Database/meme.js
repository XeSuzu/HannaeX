const mongoose = require("mongoose");

const memeSchema = new mongoose.Schema({
    // El ID del mensaje de Discord que contiene el meme
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    // El ID del usuario que subió el meme
    authorId: {
        type: String,
        required: true
    },
    // La cantidad de puntos que tiene el meme
    points: {
        type: Number,
        default: 0
    },
    // Opcional: Para saber en qué servidor se subió
    guildId: {
        type: String,
        required: true
    },
    // Opcional: para saber la URL del meme
    memeUrl: {
      type: String,
      required: true
    }
});

module.exports = mongoose.model("Meme", memeSchema);