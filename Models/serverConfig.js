const mongoose = require("mongoose");

const serverConfigSchema = new mongoose.Schema({
    // El ID del servidor de Discord
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // El ID del canal donde se suben los memes
    memeChannelId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("ServerConfig", serverConfigSchema);