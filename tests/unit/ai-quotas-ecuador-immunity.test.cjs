const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));
const { AiExemptionService } = require(path.join(buildDir, "Core/AI/Quota/AiExemptionService.js"));
const { getEcuadorCycleInfo, ECUADOR_TIMEZONE } = require(path.join(buildDir, "Core/AI/Quota/QuotaTypes.js"));
const { isResearchQuery } = require(path.join(buildDir, "Features/aiHandler.js"));

test("1. Usuario normal en servidor normal: Respeta límites 20 investigación / 40 conversación", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_normal_1";
  const guildId = "guild_normal_1";

  const status = await QuotaManager.getStatus(userId, guildId);
  assert.equal(status.conversation.maxCapacity, 40);
  assert.equal(status.conversation.balance, 40);
  assert.equal(status.research.maxCapacity, 20);
  assert.equal(status.research.balance, 20);
  assert.equal(status.bothExhausted, false);
  assert.equal(status.isExempt, false);
});

test("2. Independencia de cuotas: Investigar descuenta investigación (no conversación), conversar descuenta conversación (no investigación)", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_indep_1";

  // Consumir 5 investigaciones
  for (let i = 0; i < 5; i++) {
    const res = await QuotaManager.reserveQuota(userId, "research");
    assert.equal(res.allowed, true);
  }

  let status = await QuotaManager.getStatus(userId);
  assert.equal(status.research.balance, 15);
  assert.equal(status.research.consumedInCycle, 5);
  assert.equal(status.conversation.balance, 40, "Conversación debe seguir intacta en 40");
  assert.equal(status.conversation.consumedInCycle, 0);

  // Consumir 10 mensajes conversacionales
  for (let i = 0; i < 10; i++) {
    const res = await QuotaManager.reserveQuota(userId, "conversation");
    assert.equal(res.allowed, true);
  }

  status = await QuotaManager.getStatus(userId);
  assert.equal(status.research.balance, 15, "Investigación debe seguir en 15");
  assert.equal(status.research.consumedInCycle, 5);
  assert.equal(status.conversation.balance, 30);
  assert.equal(status.conversation.consumedInCycle, 10);
});

test("3. Investigación agotada no bloquea conversación", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_res_exhausted";

  // Agotar las 20 investigaciones
  for (let i = 0; i < 20; i++) {
    const res = await QuotaManager.reserveQuota(userId, "research");
    assert.equal(res.allowed, true);
  }

  // La 21ª investigación debe ser denegada
  const resExtra = await QuotaManager.reserveQuota(userId, "research");
  assert.equal(resExtra.allowed, false);

  // Conversación debe seguir disponible
  const status = await QuotaManager.getStatus(userId);
  assert.equal(status.research.balance, 0);
  assert.equal(status.conversation.balance, 40);
  assert.equal(status.bothExhausted, false);

  const convRes = await QuotaManager.reserveQuota(userId, "conversation");
  assert.equal(convRes.allowed, true);
});

test("4. Conversación agotada no bloquea investigación", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_conv_exhausted";

  // Agotar las 40 conversaciones
  for (let i = 0; i < 40; i++) {
    const res = await QuotaManager.reserveQuota(userId, "conversation");
    assert.equal(res.allowed, true);
  }

  // La 41ª conversación debe ser denegada
  const convExtra = await QuotaManager.reserveQuota(userId, "conversation");
  assert.equal(convExtra.allowed, false);

  // Investigación debe seguir disponible
  const status = await QuotaManager.getStatus(userId);
  assert.equal(status.conversation.balance, 0);
  assert.equal(status.research.balance, 20);
  assert.equal(status.bothExhausted, false);

  const resRes = await QuotaManager.reserveQuota(userId, "research");
  assert.equal(resRes.allowed, true);
});

test("5. Ambas cuotas agotadas: Bloqueo total de nuevas generaciones", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_both_exhausted";

  for (let i = 0; i < 20; i++) await QuotaManager.reserveQuota(userId, "research");
  for (let i = 0; i < 40; i++) await QuotaManager.reserveQuota(userId, "conversation");

  const status = await QuotaManager.getStatus(userId);
  assert.equal(status.research.balance, 0);
  assert.equal(status.conversation.balance, 0);
  assert.equal(status.bothExhausted, true);

  assert.equal((await QuotaManager.reserveQuota(userId, "research")).allowed, false);
  assert.equal((await QuotaManager.reserveQuota(userId, "conversation")).allowed, false);
});

test("6. Aviso automático de agotamiento: Se envía una sola vez por ciclo", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_notice_test";

  let notified = await QuotaManager.hasExhaustionNoticeBeenSent(userId);
  assert.equal(notified, false);

  await QuotaManager.markExhaustionNoticeSent(userId);
  notified = await QuotaManager.hasExhaustionNoticeBeenSent(userId);
  assert.equal(notified, true);

  // No debe enviar una segunda vez en el mismo ciclo
  assert.equal(await QuotaManager.hasExhaustionNoticeBeenSent(userId), true);
});

test("7. Servidor de pruebas: Todos los usuarios tienen inmunidad en el servidor de pruebas", async () => {
  QuotaManager.clearMemoryStore();
  const testGuild = "guild_test_official_123";
  AiExemptionService.setTestGuildOverride(testGuild, true);

  try {
    const normalUser = "user_in_test_guild";

    // En servidor de pruebas
    const testStatus = await QuotaManager.getStatus(normalUser, testGuild);
    assert.equal(testStatus.isExempt, true);
    assert.equal(testStatus.exemptionRole, "test_guild");
    assert.equal(testStatus.conversation.balance, Infinity);
    assert.equal(testStatus.research.balance, Infinity);

    // Consumo ilimitado permitido
    for (let i = 0; i < 50; i++) {
      const res = await QuotaManager.reserveQuota(normalUser, "conversation", testGuild);
      assert.equal(res.allowed, true);
    }

    // Fuera del servidor de pruebas (servidor normal): Respeta límites normales
    const normalGuildStatus = await QuotaManager.getStatus(normalUser, "other_guild_999");
    assert.equal(normalGuildStatus.isExempt, false);
    assert.equal(normalGuildStatus.conversation.maxCapacity, 40);
    assert.equal(normalGuildStatus.research.maxCapacity, 20);
  } finally {
    AiExemptionService.setTestGuildOverride(testGuild, false);
  }
});

test("8. Inmunidad total del propietario: Exento en cualquier servidor y en DMs", async () => {
  QuotaManager.clearMemoryStore();
  const ownerId = "owner_discord_user_001";
  AiExemptionService.setOwnerOverride(ownerId, true);

  try {
    // 1. En servidor normal
    const stServer = await QuotaManager.getStatus(ownerId, "some_server");
    assert.equal(stServer.isExempt, true);
    assert.equal(stServer.exemptionRole, "owner");
    assert.equal(stServer.conversation.balance, Infinity);
    assert.equal(stServer.research.balance, Infinity);

    // 2. En DM (sin servidor)
    const stDm = await QuotaManager.getStatus(ownerId, null);
    assert.equal(stDm.isExempt, true);
    assert.equal(stDm.exemptionRole, "owner");

    // 3. En servidor de pruebas
    const stTest = await QuotaManager.getStatus(ownerId, "guild_test_official_123");
    assert.equal(stTest.isExempt, true);
    assert.equal(stTest.exemptionRole, "owner");

    // 4. Reservas ilimitadas
    for (let i = 0; i < 100; i++) {
      const res = await QuotaManager.reserveQuota(ownerId, "research", "some_server");
      assert.equal(res.allowed, true);
    }
  } finally {
    AiExemptionService.setOwnerOverride(ownerId, false);
  }
});

test("9. ID del propietario ausente: Falla cerrado (no concede inmunidad accidental)", async () => {
  const originalOwnerId = process.env.BOT_OWNER_ID;
  delete process.env.BOT_OWNER_ID;

  try {
    const isOwnerEmpty = AiExemptionService.isOwner("random_user_123");
    assert.equal(isOwnerEmpty, false);

    process.env.BOT_OWNER_ID = "   ";
    const isOwnerSpaces = AiExemptionService.isOwner("random_user_123");
    assert.equal(isOwnerSpaces, false);
  } finally {
    if (originalOwnerId !== undefined) {
      process.env.BOT_OWNER_ID = originalOwnerId;
    } else {
      delete process.env.BOT_OWNER_ID;
    }
  }
});

test("10. Reinicio a las 00:00 Ecuador (America/Guayaquil): Cálculo de ciclo", () => {
  // Viernes 2026-11-06 a las 23:59:00 hora de Ecuador (UTC-5)
  // En UTC es 2026-11-07 04:59:00
  const timeBeforeReset = new Date("2026-11-07T04:59:00.000Z").getTime();
  const cycleBefore = getEcuadorCycleInfo(timeBeforeReset);

  // Viernes 2026-11-07 a las 00:01:00 hora de Ecuador (UTC-5)
  // En UTC es 2026-11-07 05:01:00
  const timeAfterReset = new Date("2026-11-07T05:01:00.000Z").getTime();
  const cycleAfter = getEcuadorCycleInfo(timeAfterReset);

  assert.notEqual(cycleBefore.cycleStart, cycleAfter.cycleStart, "El inicio de ciclo debe cambiar al pasar las 00:00 Ecuador");
  assert.equal(cycleAfter.cycleStart, new Date("2026-11-07T05:00:00.000Z").getTime(), "El nuevo ciclo debe iniciar a las 05:00 UTC (00:00 Ecuador)");
});

test("11. Rollback ante error de Gemini: No deja cuota consumida", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "user_rollback_test";

  const reserve = await QuotaManager.reserveQuota(userId, "conversation");
  assert.equal(reserve.allowed, true);

  let st = await QuotaManager.getStatus(userId);
  assert.equal(st.conversation.balance, 39);
  assert.equal(st.conversation.consumedInCycle, 1);

  // Error simulado -> rollback
  await QuotaManager.rollbackQuota(userId, "conversation");

  st = await QuotaManager.getStatus(userId);
  assert.equal(st.conversation.balance, 40);
  assert.equal(st.conversation.consumedInCycle, 0);
});

test("12. Clasificador isResearchQuery: Detecta intención de búsqueda vs conversación", () => {
  assert.equal(isResearchQuery("¿Puedes buscar noticias sobre el clima en Quito?"), true);
  assert.equal(isResearchQuery("investiga el precio de bitcoin hoy"), true);
  assert.equal(isResearchQuery("quién ganó el partido de anoche"), true);
  assert.equal(isResearchQuery("cuándo sale la nueva película de anime"), true);

  assert.equal(isResearchQuery("hola Hoshiko, ¿cómo estás?"), false);
  assert.equal(isResearchQuery("cuéntame un chiste de gatos"), false);
  assert.equal(isResearchQuery("buenas noches que descanses"), false);
});
