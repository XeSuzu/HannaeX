const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { PrivateConversationSessionManager } = require(path.join(buildDir, "Features/ai/PrivateConversationSessionManager.js"));
const { TopicCompactor } = require(path.join(buildDir, "Core/AI/Session/TopicCompactor.js"));

test("Phase 2 - TopicCompactor: Retiene 6 turnos literales y compacta los turnos anteriores", () => {
  const userId = "u_compact_test";
  const channelId = "c_compact_test";

  PrivateConversationSessionManager.clearSession(userId, channelId);

  // Agregar 6 turnos literales
  const sampleTurns = [
    { role: "user", text: "Hola Hoshiko, hablemos de astrofísica y agujeros negros", timestamp: 1000 },
    { role: "model", text: "¡Hola! Me encanta ese tema, los agujeros negros son fascinantes", timestamp: 2000 },
    { role: "user", text: "¿Qué es el horizonte de sucesos?", timestamp: 3000 },
    { role: "model", text: "Es el límite a partir del cual nada puede escapar", timestamp: 4000 },
    { role: "user", text: "Y la radiación de Hawking?", timestamp: 5000 },
    { role: "model", text: "Es la emisión térmica predicha por Stephen Hawking", timestamp: 6000 },
  ];

  for (const turn of sampleTurns) {
    PrivateConversationSessionManager.appendTurn(userId, channelId, turn);
  }

  let session = PrivateConversationSessionManager.getSessionContext(userId, channelId);
  assert.equal(session.turns.length, 6);
  assert.equal(session.topicSummary, undefined);

  // Agregar turno 7 y 8
  PrivateConversationSessionManager.appendTurn(userId, channelId, {
    role: "user",
    text: "Cambiando de tema, ¿cuál es tu lenguaje de programación favorito?",
    timestamp: 7000,
  });
  PrivateConversationSessionManager.appendTurn(userId, channelId, {
    role: "model",
    text: "Me gusta mucho TypeScript por su tipado estricto",
    timestamp: 8000,
  });

  session = PrivateConversationSessionManager.getSessionContext(userId, channelId);
  // Debe mantenerse en 6 turnos literales
  assert.equal(session.turns.length, 6);
  // Debe tener topicSummary con los temas antiguos
  assert.notEqual(session.topicSummary, undefined);
  assert.match(session.topicSummary, /Temas previos tratados/i);
  assert.match(session.topicSummary, /agujeros|astrofisica|horizonte/i);
});

test("Phase 2 - TopicCompactor: Extracción determinista de palabras clave sin stopwords", () => {
  const turns = [
    { role: "user", text: "Quiero aprender sobre React y componentes visuales en la web", timestamp: 1 },
    { role: "model", text: "React utiliza un Virtual DOM para renderizar eficientemente", timestamp: 2 },
  ];

  const summary = TopicCompactor.compactTurns(turns);
  assert.match(summary, /react|componentes|virtual|renderizar/i);
  // No debe contener stopwords como "sobre", "para", "la"
  const words = summary.toLowerCase().split(/\s+/);
  assert.equal(words.includes("sobre"), false);
});
