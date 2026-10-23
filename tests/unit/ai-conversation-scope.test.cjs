const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

test("AI-01: conversationSchema posee índice compuesto único { userId: 1, guildId: 1 }", () => {
  const { Conversation } = require(path.join(buildRoot, "Database/ai/conversation.model.js"));
  assert.ok(Conversation, "El modelo Conversation debe estar exportado");
  assert.ok(Conversation.schema, "Debe tener un Schema definido");

  const indexes = Conversation.schema.indexes();
  const compoundIndex = indexes.find(
    ([fields, options]) => fields.userId === 1 && fields.guildId === 1 && options?.unique === true,
  );

  assert.ok(
    compoundIndex,
    "Debe existir un índice compuesto único { userId: 1, guildId: 1 } para aislar historiales por servidor",
  );
});

test("AI-01: funciones de conveniencia de Conversation aceptan guildId y consultan con aislamiento", async () => {
  const conversationModule = require(path.join(buildRoot, "Database/ai/conversation.model.js"));
  const { Conversation, getHistory, addToHistory, clearHistory, getHistoryStats } = conversationModule;

  // Interceptar llamadas Mongoose para verificar parámetros sin timeout de conexión
  const origFindOneAndUpdate = Conversation.findOneAndUpdate;
  const origDeleteOne = Conversation.deleteOne;
  const origFindOne = Conversation.findOne;

  const capturedQueries = [];

  try {
    Conversation.findOneAndUpdate = async (query, update, options) => {
      capturedQueries.push({ method: "findOneAndUpdate", query, update, options });
      return { history: [{ role: "user", content: "hola", timestamp: new Date() }] };
    };

    Conversation.deleteOne = async (query) => {
      capturedQueries.push({ method: "deleteOne", query });
      return { deletedCount: 1 };
    };

    Conversation.findOne = async (query) => {
      capturedQueries.push({ method: "findOne", query });
      return {
        history: [
          { role: "user", content: "hola", timestamp: new Date() },
          { role: "assistant", content: "nya", timestamp: new Date() },
        ],
      };
    };

    const history = await getHistory("user-1", "guild-A");
    assert.equal(history.length, 1);
    assert.deepEqual(capturedQueries[0].query, { userId: "user-1", guildId: "guild-A" });

    await addToHistory("user-1", "assistant", "¡Hola!", "guild-A");
    assert.deepEqual(capturedQueries[1].query, { userId: "user-1", guildId: "guild-A" });

    // Fallback a "dm" si no se suministra guildId
    await clearHistory("user-1");
    assert.deepEqual(capturedQueries[2].query, { userId: "user-1", guildId: "dm" });

    const stats = await getHistoryStats("user-1", "guild-B");
    assert.equal(stats.totalMessages, 2);
    assert.deepEqual(capturedQueries[3].query, { userId: "user-1", guildId: "guild-B" });
  } finally {
    Conversation.findOneAndUpdate = origFindOneAndUpdate;
    Conversation.deleteOne = origDeleteOne;
    Conversation.findOne = origFindOne;
  }
});

test("AI-02: aiModeration.ts eliminó el código muerto vestigial y preserva los métodos legítimos", () => {
  const aiMod = require(path.join(buildRoot, "Features/automod/aiModeration.js"));

  // Símbolos activos que deben existir
  assert.equal(typeof aiMod.evaluateWithLocalRegex, "function");
  assert.equal(typeof aiMod.evaluateHighStressMessage, "function");
  assert.equal(typeof aiMod.judgeMessageWithAi, "function");

  // Símbolos vestigiales de sanciones automáticas no deben existir
  assert.equal(aiMod.applyVerdict, undefined);
  assert.equal(aiMod.flushGuildModBatch, undefined);
  assert.equal(aiMod.PendingModMessage, undefined);
});
