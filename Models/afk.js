const { Schema, model, models } = require("mongoose");

const afkSchema = new Schema({

  userId: { type: String, required: true },
  
  guildId: { type: String, required: true },
  
  reason: { type: String, default: "AFK 🐾" },
  timestamp: { type: Date, default: Date.now },
});

afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = models.AFK || model("AFK", afkSchema);