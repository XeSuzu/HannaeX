const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

// Stub de configuración: evita tocar MongoDB. Redis queda "disabled" por defecto → solo L1.
const { SettingsManager } = require(
  path.join(buildRoot, "Database/guild/SettingsManager.js"),
);
SettingsManager.getSettings = async () => ({
  securityModules: { securityLevel: 2 },
});

const state = require(path.join(buildRoot, "Features/automod/automodState.js"));
const {
  evaluateWithLocalRegex,
  selectRaidSuspects,
  banInChunks,
} = require(path.join(buildRoot, "Features/automod/aiModeration.js"));
const { QueueService } = require(
  path.join(buildRoot, "App/infrastructure/queue/QueueService.js"),
);

const guild = (id) => ({ id, name: "Test" });

test("checkCrossChannelSpam - mismo texto o variaciones mínimas en 3 canales distintos dispara mute y +40 pts", async () => {
  const g = guild("g-xchan");
  assert.equal(
    await state.checkCrossChannelSpam(g, "u1", "c1", "Compra Nitro Gratis #1!"),
    null,
  );
  assert.equal(
    await state.checkCrossChannelSpam(g, "u1", "c2", "compra nitro gratis #2??"),
    null,
  );
  const action = await state.checkCrossChannelSpam(
    g,
    "u1",
    "c3",
    "COMPRA NITRO GRATIS #3...",
  );
  assert.equal(action?.type, "mute");
  assert.ok((await state.getServerStress("g-xchan")) >= 39);
});

test("checkCrossChannelSpam - imágenes idénticas sin texto en 3 canales disparan mute", async () => {
  const g = guild("g-ximg");
  assert.equal(await state.checkCrossChannelSpam(g, "u2", "c1", "", [184320]), null);
  assert.equal(await state.checkCrossChannelSpam(g, "u2", "c2", "", [184320]), null);
  const action = await state.checkCrossChannelSpam(g, "u2", "c3", "", [184320]);
  assert.equal(action?.type, "mute");
});

test("checkCrossChannelSpam - repetir en el mismo canal no cuenta como multicanal", async () => {
  const g = guild("g-same");
  const msg = "hola a todos que tal";
  for (let i = 0; i < 4; i++) {
    assert.equal(await state.checkCrossChannelSpam(g, "u1", "c1", msg), null);
  }
});

test("checkCrossChannelSpam - ignora mensajes cortos sin adjuntos", async () => {
  const g = guild("g-short");
  for (const ch of ["c1", "c2", "c3"]) {
    assert.equal(await state.checkCrossChannelSpam(g, "u1", ch, "ok"), null);
  }
});

test("checkVoiceThrashing - 4 saltos sin actividad de texto disparan +25 pts, pero con texto se ignoran", async () => {
  const results = [];
  for (let i = 0; i < 4; i++) {
    results.push(await state.checkVoiceThrashing("g-vc", "u1"));
  }
  assert.deepEqual(
    results.map((r) => r.triggered),
    [false, false, false, true],
  );
  assert.equal(results[3].stressAdded, 25);

  state.markTextActivity("g-vc", "u2");
  for (let i = 0; i < 4; i++) {
    const res = await state.checkVoiceThrashing("g-vc", "u2");
    assert.equal(res.triggered, false);
  }
});

test("isIrregularName - detecta caracteres invisibles, zalgo, exceso de símbolos o rachas numéricas", () => {
  assert.equal(state.isIrregularName("Hanna"), false);
  assert.equal(state.isIrregularName("Juan_Perez99"), false);
  assert.equal(state.isIrregularName("user987654"), true);
  assert.equal(state.isIrregularName("a\u200Bb"), true);
  assert.equal(state.isIrregularName("$$$___***"), true);
});

test("rememberDeletedMessage y takeDeletedMessages - almacena y consume mensajes borrados para Falso Positivo", () => {
  state.rememberDeletedMessage("g-del", "u9", "ch-1", "mensaje legítimo borrado");
  const restored = state.takeDeletedMessages("g-del", "u9");
  assert.equal(restored.length, 1);
  assert.equal(restored[0].content, "mensaje legítimo borrado");
  assert.equal(state.takeDeletedMessages("g-del", "u9").length, 0);
});

test("evaluateWithLocalRegex - detecta leetspeak y scams sin marcar menciones normales", () => {
  assert.equal(evaluateWithLocalRegex("fr33 n1tr0 here").toxic, true);
  assert.equal(evaluateWithLocalRegex("join discord.gg/abc123").toxic, true);
  assert.equal(evaluateWithLocalRegex("st3am gift para ti").toxic, true);
  assert.equal(evaluateWithLocalRegex("hola, como estan?").toxic, false);
  assert.equal(evaluateWithLocalRegex("@everyone reunion a las 8").toxic, false);
  assert.equal(evaluateWithLocalRegex("me gusta skyrim").toxic, false);
});

test("selectRaidSuspects y banInChunks - filtra cuentas recientes y banea en lotes pausados", async () => {
  const now = 1_700_000_000_000;
  const members = [
    {
      id: "raider-1",
      joinedTimestamp: now - 60_000,
      user: { bot: false, createdTimestamp: now - 3600_000 },
    },
    {
      id: "veteran",
      joinedTimestamp: now - 60_000,
      user: { bot: false, createdTimestamp: now - 90 * 86_400_000 },
    },
    {
      id: "bot-1",
      joinedTimestamp: now - 10_000,
      user: { bot: true, createdTimestamp: now - 10_000 },
    },
  ];
  const suspects = selectRaidSuspects(members, now);
  assert.deepEqual(suspects, ["raider-1"]);

  const bannedIds = [];
  const total = await banInChunks(
    ["u1", "u2", "u3", "u4", "u5", "u6"],
    async (id) => {
      bannedIds.push(id);
    },
    1,
  );
  assert.equal(total, 6);
  assert.equal(bannedIds.length, 6);
});

test("QueueService.registerBatcher - dispara lote inmediatamente al llegar a maxSize", async () => {
  let received = [];
  QueueService.registerBatcher(
    "test_mod_batch",
    { maxSize: 3, windowMs: 10_000 },
    async (_key, items) => {
      received = items;
    },
  );
  QueueService.enqueueBatchItem("test_mod_batch", "g1", "m1");
  QueueService.enqueueBatchItem("test_mod_batch", "g1", "m2");
  QueueService.enqueueBatchItem("test_mod_batch", "g1", "m3");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(received, ["m1", "m2", "m3"]);
});
