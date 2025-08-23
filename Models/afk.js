const mongoose = require("mongoose");

const afkSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, default: "AFK 🐾" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AFK || mongoose.model("AFK", afkSchema);
