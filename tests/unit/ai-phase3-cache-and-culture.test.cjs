const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { handleCulture } = require(path.join(buildDir, "Features/cultureHandler.js"));
const { shouldBlockMessage } = require(path.join(buildDir, "Features/ai/contentPolicy.js"));
const { CacheManager } = require(path.join(buildDir, "Database/guild/CacheManager.js"));
const ServerConfig = require(path.join(buildDir, "Database/guild/serverConfig.model.js")).default;

test("Fase 3: handleCulture no llama a CacheManager.flush ni genera $inc dinámicos", async () => {
  let flushCalled = false;
  let updateOnePayload = null;

  const originalFlush = CacheManager.flush;
  const originalUpdateOne = ServerConfig.collection.updateOne;

  CacheManager.flush = () => {
    flushCalled = true;
  };

  ServerConfig.collection.updateOne = async (filter, update) => {
    updateOnePayload = { filter, update };
    return { modifiedCount: 1 };
  };

  try {
    const fakeMessage = {
      guild: { id: "guild_test_1" },
      guildId: "guild_test_1",
      author: { id: "user_test_1", bot: false },
      content: "hola a todos en el servidor amigos",
    };

    await handleCulture(fakeMessage);

    assert.equal(flushCalled, false, "handleCulture NO debe llamar a CacheManager.flush");
    assert.ok(updateOnePayload, "Debe llamar a updateOne");
    assert.equal(updateOnePayload.update.$inc, undefined, "No debe incluir operador $inc con claves dinámicas");
    assert.ok(updateOnePayload.update.$push.shortTermMemory, "Debe empujar a shortTermMemory con slice");
  } finally {
    CacheManager.flush = originalFlush;
    ServerConfig.collection.updateOne = originalUpdateOne;
  }
});

test("Fase 3: shouldBlockMessage detecta términos bloqueados y sensibles", () => {
  const blocked = shouldBlockMessage("como hacer una bomba casera");
  assert.equal(blocked.block, true);
  assert.match(blocked.reason, /Ese tema no puedo tocarlo/);

  const sensitive = shouldBlockMessage("tengo mucha ansiedad y depresion hoy");
  assert.equal(sensitive.block, true);
  assert.match(sensitive.reason, /Prefiero que hablemos de cosas más tranquilas/);

  const normal = shouldBlockMessage("Me gusta programar en TypeScript");
  assert.equal(normal.block, false);
});

test("Fase 3: LocalCacheService updateAgeOnGet:false garantiza expiración absoluta bajo lecturas continuas", async () => {
  const { LocalCacheService } = require(path.join(buildDir, "App/infrastructure/cache/LocalCacheService.js"));

  // Caché con expiración absoluta (updateAgeOnGet: false)
  const absoluteCache = new LocalCacheService("test_abs", {
    max: 100,
    ttlMs: 60,
    updateAgeOnGet: false,
  });

  // Caché con expiración deslizante (updateAgeOnGet: true)
  const slidingCache = new LocalCacheService("test_sliding", {
    max: 100,
    ttlMs: 60,
    updateAgeOnGet: true,
  });

  absoluteCache.set("key1", { val: 1 });
  slidingCache.set("key1", { val: 1 });

  // Esperar 40ms y hacer get() en ambas
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.ok(absoluteCache.get("key1"), "Debe existir a los 40ms");
  assert.ok(slidingCache.get("key1"), "Debe existir a los 40ms");

  // Esperar otros 30ms (tiempo total transcurrido: 70ms > ttlMs de 60ms)
  await new Promise((resolve) => setTimeout(resolve, 30));

  // La caché absoluta ya debe haber expirado a los 60ms a pesar de la lectura
  assert.equal(absoluteCache.get("key1"), undefined, "absoluteCache NO debe renovar TTL con get()");

  // La caché deslizante (sliding) se renovó a los 40ms, por lo que a los 70ms sigue viva
  assert.ok(slidingCache.get("key1"), "slidingCache debe seguir viva tras get() intermedio");
});
