const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { LocalIntentResolver } = require(path.join(buildDir, "Core/AI/Resolution/LocalIntentResolver.js"));
const { PersonalMemoryService } = require(path.join(buildDir, "Core/AI/Memory/PersonalMemoryService.js"));

test("Phase 2 - LocalIntent: Saludos y despedidas se resuelven localmente", async () => {
  const g1 = await LocalIntentResolver.resolve("u1", "¡Hola!");
  assert.notEqual(g1, null);
  assert.equal(g1.handled, true);
  assert.equal(g1.intent, "greeting");
  assert.match(g1.replyText, /Hola/i);

  const f1 = await LocalIntentResolver.resolve("u1", "Muchas gracias!");
  assert.notEqual(f1, null);
  assert.equal(f1.handled, true);
  assert.equal(f1.intent, "farewell");
  assert.match(f1.replyText, /Con mucho gusto/i);

  const f2 = await LocalIntentResolver.resolve("u1", "adiós!");
  assert.notEqual(f2, null);
  assert.equal(f2.handled, true);
  assert.equal(f2.intent, "farewell");
  assert.match(f2.replyText, /Hasta luego/i);
});

test("Phase 2 - LocalIntent: Consultas complejas no se interceptan y retornan null", async () => {
  const q1 = await LocalIntentResolver.resolve("u1", "¿Cómo funciona un agujero negro?");
  assert.equal(q1, null);

  const q2 = await LocalIntentResolver.resolve("u1", "Escribe una función en TypeScript para calcular fibonacci");
  assert.equal(q2, null);
});

test("Phase 2 - LocalIntent: Preferencias e imágenes configurables localmente", async () => {
  const userId = "u_prefs_test";

  // 1. Consultar preferencias por defecto
  const p1 = await LocalIntentResolver.resolve(userId, "¿Cuáles son mis preferencias?");
  assert.notEqual(p1, null);
  assert.equal(p1.intent, "preferences_query");
  assert.match(p1.replyText, /balanceado/i);

  // 2. Modificar estilo a conciso
  const p2 = await LocalIntentResolver.resolve(userId, "ajusta mi estilo a conciso");
  assert.notEqual(p2, null);
  assert.equal(p2.intent, "preferences_update");
  assert.match(p2.replyText, /conciso/i);

  const prefsUpdated = await PersonalMemoryService.getPreferences(userId);
  assert.equal(prefsUpdated.style, "concise");

  // 3. Desactivar imágenes
  const p3 = await LocalIntentResolver.resolve(userId, "desactiva las imágenes");
  assert.notEqual(p3, null);
  assert.equal(p3.intent, "preferences_update");
  assert.match(p3.replyText, /sin imágenes/i);

  const prefsNoVisuals = await PersonalMemoryService.getPreferences(userId);
  assert.equal(prefsNoVisuals.allowVisuals, false);
});
