const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));
const { CYCLE_DURATION_MS } = require(path.join(buildDir, "Core/AI/Quota/QuotaTypes.js"));

test("Phase 2 - Quota: Capacidades iniciales independientes por usuario", async () => {
  QuotaManager.clearMemoryStore();
  let fakeTime = 1700000000000;
  QuotaManager.setTimeOverride(() => fakeTime);

  try {
    const status = await QuotaManager.getStatus("user_alice_quota");
    assert.equal(status.conversation.maxCapacity, 40);
    assert.equal(status.conversation.balance, 40);
    assert.equal(status.conversation.consumedInCycle, 0);

    assert.equal(status.research.maxCapacity, 20);
    assert.equal(status.research.balance, 20);
    assert.equal(status.research.consumedInCycle, 0);

    assert.equal(status.bothExhausted, false);
  } finally {
    QuotaManager.setTimeOverride(null);
  }
});

test("Phase 2 - Quota: Consumo progresivo y saldo restante en investigación", async () => {
  QuotaManager.clearMemoryStore();
  let fakeTime = 1700000000000;
  QuotaManager.setTimeOverride(() => fakeTime);

  try {
    // 1. Consumir 4 investigaciones
    for (let i = 0; i < 4; i++) {
      const res = await QuotaManager.reserveQuota("user_bob_quota", "research");
      assert.equal(res.allowed, true);
    }
    let st = await QuotaManager.getSingleStatus("user_bob_quota", "research");
    assert.equal(st.balance, 16);
    assert.equal(st.consumedInCycle, 4);

    // 2. Consumir 3 investigaciones más
    for (let i = 0; i < 3; i++) {
      const res = await QuotaManager.reserveQuota("user_bob_quota", "research");
      assert.equal(res.allowed, true);
    }
    st = await QuotaManager.getSingleStatus("user_bob_quota", "research");
    assert.equal(st.balance, 13);
    assert.equal(st.consumedInCycle, 7);
  } finally {
    QuotaManager.setTimeOverride(null);
  }
});

test("Phase 2 - Quota: Reposición parcial exacta al cumplirse el ciclo de 24 horas", async () => {
  QuotaManager.clearMemoryStore();
  let fakeTime = 1700000000000;
  QuotaManager.setTimeOverride(() => fakeTime);

  try {
    // Consumir 7 unidades
    for (let i = 0; i < 7; i++) {
      await QuotaManager.reserveQuota("user_cycle_test", "research");
    }
    let st = await QuotaManager.getSingleStatus("user_cycle_test", "research");
    assert.equal(st.balance, 13);
    assert.equal(st.consumedInCycle, 7);

    // Avanzar reloj simulado a 24 horas + 1 segundo
    fakeTime += CYCLE_DURATION_MS + 1000;

    // Al consultar, debe reponer exactamente las 7 unidades consumidas
    st = await QuotaManager.getSingleStatus("user_cycle_test", "research");
    assert.equal(st.balance, 20, "Debe restaurar el saldo a 20 (13 + 7)");
    assert.equal(st.consumedInCycle, 0, "Debe resetear el acumulado consumido del nuevo ciclo");
    assert.equal(st.cycleStartTime, fakeTime, "Debe actualizar el inicio del nuevo ciclo");
  } finally {
    QuotaManager.setTimeOverride(null);
  }
});

test("Phase 2 - Quota: No sobrepasa la capacidad máxima y bloquea al agotarse", async () => {
  QuotaManager.clearMemoryStore();
  let fakeTime = 1700000000000;
  QuotaManager.setTimeOverride(() => fakeTime);

  try {
    // Agotar las 20 investigaciones
    for (let i = 0; i < 20; i++) {
      const res = await QuotaManager.reserveQuota("user_exhaust_test", "research");
      assert.equal(res.allowed, true);
    }

    // El intento 21 debe ser denegado
    const denied = await QuotaManager.reserveQuota("user_exhaust_test", "research");
    assert.equal(denied.allowed, false);
    assert.equal(denied.status.balance, 0);

    // Rollback de 1 unidad
    await QuotaManager.rollbackQuota("user_exhaust_test", "research");
    const recovered = await QuotaManager.getSingleStatus("user_exhaust_test", "research");
    assert.equal(recovered.balance, 1);
    assert.equal(recovered.consumedInCycle, 19);
  } finally {
    QuotaManager.setTimeOverride(null);
  }
});
