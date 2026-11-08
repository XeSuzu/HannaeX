const test = require("node:test");
const assert = require("node:assert");

test("AutoModSyncService: estructura de reglas nativas y sincronización", async () => {
  const { AutoModSyncService } = require("../../apps/hoshiko/dist/Features/automod/AutoModSyncService.js");
  assert.strictEqual(typeof AutoModSyncService.syncGuildAutoMod, "function");
  assert.strictEqual(typeof AutoModSyncService.syncAllGuildsAutoMod, "function");
});

test("Events: autoModerationActionExecution listener registrado correctamente", async () => {
  const event = require("../../apps/hoshiko/dist/Events/Client/autoModerationActionExecution.js").default;
  assert.strictEqual(event.name, "autoModerationActionExecution");
  assert.strictEqual(typeof event.execute, "function");
});
