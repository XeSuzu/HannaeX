const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { AiExemptionService } = require(path.join(buildDir, "Core/AI/Quota/AiExemptionService.js"));
const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));

test("Phase 2 - Exemption: Developer dispone de cuotas ilimitadas globales incondicionales", async () => {
  AiExemptionService.clearMemory();
  QuotaManager.clearMemoryStore();

  const devUserId = "u_dev_master_999";
  AiExemptionService.setDeveloperOverride(devUserId, true);

  try {
    // 1. Verificación directa de servicio
    const exGlobal = await AiExemptionService.hasQuotaExemption(devUserId, null);
    assert.equal(exGlobal.exempt, true);
    assert.equal(exGlobal.role, "developer");

    const exGuildA = await AiExemptionService.hasQuotaExemption(devUserId, "guild_any_server");
    assert.equal(exGuildA.exempt, true);
    assert.equal(exGuildA.role, "developer");

    // 2. Reserva de cuota en QuotaManager
    const resDev = await QuotaManager.reserveQuota(devUserId, "conversation", "guild_any_server");
    assert.equal(resDev.allowed, true);
    assert.equal(resDev.status.balance, Infinity);
    assert.equal(resDev.status.maxCapacity, Infinity);
    assert.equal(resDev.reservationId.includes("exempt_developer"), true);

    // 3. Status
    const stDev = await QuotaManager.getStatus(devUserId, "guild_any_server");
    assert.equal(stDev.conversation.balance, Infinity);
    assert.equal(stDev.research.balance, Infinity);
  } finally {
    AiExemptionService.setDeveloperOverride(devUserId, false);
  }
});

test("Phase 2 - Exemption: Tester tiene cuotas ilimitadas SOLO en el servidor autorizado", async () => {
  AiExemptionService.clearMemory();
  QuotaManager.clearMemoryStore();

  const testerUserId = "u_tester_bob_123";
  const devGuildId = "guild_test_server_456";
  const otherGuildId = "guild_public_server_789";

  // 1. Invitar al tester al servidor de pruebas
  const addRes = await AiExemptionService.addTester(devGuildId, testerUserId, "admin_alice");
  assert.equal(addRes.success, true);

  // 2. En el servidor de pruebas: Cuota ilimitada
  const exInDev = await AiExemptionService.hasQuotaExemption(testerUserId, devGuildId);
  assert.equal(exInDev.exempt, true);
  assert.equal(exInDev.role, "tester");

  const resInDev = await QuotaManager.reserveQuota(testerUserId, "conversation", devGuildId);
  assert.equal(resInDev.allowed, true);
  assert.equal(resInDev.status.balance, Infinity);

  // 3. En OTRO servidor: Sujeto a cuotas normales (40/20)
  const exOutside = await AiExemptionService.hasQuotaExemption(testerUserId, otherGuildId);
  assert.equal(exOutside.exempt, false);
  assert.equal(exOutside.role, "none");

  const resOutside = await QuotaManager.reserveQuota(testerUserId, "conversation", otherGuildId);
  assert.equal(resOutside.allowed, true);
  assert.equal(resOutside.status.maxCapacity, 40);
  assert.equal(resOutside.status.balance, 39, "Debe consumir 1 unidad de su cuota normal fuera del servidor de pruebas");

  // 4. Retirar condición de tester
  const remRes = await AiExemptionService.removeTester(devGuildId, testerUserId);
  assert.equal(remRes.success, true);

  // Ya no tiene exención ni en el servidor de pruebas
  const exAfter = await AiExemptionService.hasQuotaExemption(testerUserId, devGuildId);
  assert.equal(exAfter.exempt, false);
});

test("Phase 2 - Exemption: Listado de testers por servidor", async () => {
  AiExemptionService.clearMemory();

  const guildId = "guild_list_test";
  await AiExemptionService.addTester(guildId, "tester_1", "admin");
  await AiExemptionService.addTester(guildId, "tester_2", "admin");

  const list = await AiExemptionService.listTesters(guildId);
  assert.equal(list.length, 2);
  const ids = list.map((t) => t.userId);
  assert.ok(ids.includes("tester_1"));
  assert.ok(ids.includes("tester_2"));
});
