const mongoose = require("mongoose");

// ========================
//  MODELO DE LA BASE DE DATOS
// ========================
const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  history: [
    {
      role: String,
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Conversation = mongoose.model("Conversation", conversationSchema);

// ========================
//  FUNCIONES DE BASE DE DATOS
// ========================
async function getHistory(userId) {
  const data = await Conversation.findOne({ userId });
  return data ? data.history : [];
}

async function addToHistory(userId, role, content) {
  let conversationData = await Conversation.findOne({ userId });

  if (!conversationData) {
    conversationData = new Conversation({ userId, history: [] });
  }

  conversationData.history.push({ role, content });

  // Mantener solo las últimas 10 interacciones
  if (conversationData.history.length > 5) {
    conversationData.history.shift();
  }

  await conversationData.save();
}

module.exports = { getHistory, addToHistory };
