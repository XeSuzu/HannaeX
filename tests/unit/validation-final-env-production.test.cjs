const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dotenv = require("dotenv");

// Cargar explícitamente el entorno de producción
dotenv.config({ path: path.resolve(__dirname, "../../.env.production") });
process.env.NODE_ENV = "production";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { parseAppEnvironment } = require(path.join(buildDir, "App/config/envSchema.js"));
const { AiExemptionService } = require(path.join(buildDir, "Core/AI/Quota/AiExemptionService.js"));
const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));
const { getEcuadorCycleInfo, ECUADOR_TIMEZONE } = require(path.join(buildDir, "Core/AI/Quota/QuotaTypes.js"));
const { isResearchQuery } = require(path.join(buildDir, "Features/aiHandler.js"));
const { RedisClientService } = require(path.join(buildDir, "App/infrastructure/redis/RedisClient.js"));

const realOwnerId = process.env.BOT_OWNER_ID;
const realTestGuildId = process.env.TEST_GUILD_ID;

test("1. Validación de configuración: BOT_OWNER_ID y TEST_GUILD_ID", () => {
  assert.ok(realOwnerId, "BOT_OWNER_ID debe estar definido en .env.production");
  assert.ok(realTestGuildId, "TEST_GUILD_ID debe estar definido en .env.production");

  assert.match(realOwnerId, /^\d{17,20}$/, "BOT_OWNER_ID debe tener formato Discord snowflake (17-20 dígitos)");
  assert.match(realTestGuildId, /^\d{17,20}$/, "TEST_GUILD_ID debe tener formato Discord snowflake (17-20 dígitos)");

  // Zod schema
  const parsed = parseAppEnvironment(process.env);
  assert.equal(parsed.BOT_OWNER_ID, realOwnerId);
  assert.equal(parsed.TEST_GUILD_ID, realTestGuildId);

  // AiExemptionService
  assert.equal(AiExemptionService.isOwner(realOwnerId), true);
  assert.equal(AiExemptionService.isTestGuild(realTestGuildId), true);
});

test("2. Inmunidad del Propietario: Servidores normales, servidor de pruebas y DMs", async () => {
  QuotaManager.clearMemoryStore();
  const normalGuild = "1299943363088355428"; // Servidor normal

  // 1. En servidor normal
  const ex1 = await AiExemptionService.hasQuotaExemption(realOwnerId, normalGuild);
  assert.equal(ex1.exempt, true);
  assert.equal(ex1.role, "owner");

  const st1 = await QuotaManager.getStatus(realOwnerId, normalGuild);
  assert.equal(st1.isExempt, true);
  assert.equal(st1.conversation.balance, Infinity);
  assert.equal(st1.research.balance, Infinity);
  assert.equal(st1.bothExhausted, false);

  // 2. En servidor de pruebas
  const ex2 = await AiExemptionService.hasQuotaExemption(realOwnerId, realTestGuildId);
  assert.equal(ex2.exempt, true);
  assert.equal(ex2.role, "owner");

  const st2 = await QuotaManager.getStatus(realOwnerId, realTestGuildId);
  assert.equal(st2.isExempt, true);
  assert.equal(st2.conversation.balance, Infinity);
  assert.equal(st2.research.balance, Infinity);

  // 3. En DM (sin servidor)
  const ex3 = await AiExemptionService.hasQuotaExemption(realOwnerId, null);
  assert.equal(ex3.exempt, true);
  assert.equal(ex3.role, "owner");

  const st3 = await QuotaManager.getStatus(realOwnerId, null);
  assert.equal(st3.isExempt, true);
  assert.equal(st3.conversation.balance, Infinity);

  // 4. Reservas ilimitadas (conversación e investigación)
  for (let i = 0; i < 60; i++) {
    const resConv = await QuotaManager.reserveQuota(realOwnerId, "conversation", normalGuild);
    assert.equal(resConv.allowed, true);
    const resRes = await QuotaManager.reserveQuota(realOwnerId, "research", normalGuild);
    assert.equal(resRes.allowed, true);
  }

  // 5. Embed /ai usage refleja exención activa
  const embed = QuotaManager.createUsageEmbed(realOwnerId, "OwnerUser", st1, normalGuild);
  const json = embed.toJSON();
  const planField = json.fields.find(f => f.name.includes("Beneficios Premium"));
  assert.ok(planField, "Debe incluir campo Beneficios Premium");
  assert.ok(planField.value.includes("Inmune"), "Debe mostrar Inmune");
});

test("3. Inmunidad del Servidor de Pruebas: Excepción local sin fuga a otros servidores", async () => {
  QuotaManager.clearMemoryStore();
  const normalUser = "user_normal_ephemeral_789";
  const normalGuild = "1299943363088355428";

  // 1. Dentro del servidor de pruebas: Usuario normal es inmune
  const exTest = await AiExemptionService.hasQuotaExemption(normalUser, realTestGuildId);
  assert.equal(exTest.exempt, true);
  assert.equal(exTest.role, "test_guild");

  const stTest = await QuotaManager.getStatus(normalUser, realTestGuildId);
  assert.equal(stTest.isExempt, true);
  assert.equal(stTest.conversation.balance, Infinity);
  assert.equal(stTest.research.balance, Infinity);

  // 2. Fuera del servidor de pruebas: Queda sujeto a cuotas 20/40 normales
  const exNormal = await AiExemptionService.hasQuotaExemption(normalUser, normalGuild);
  assert.equal(exNormal.exempt, false);
  assert.equal(exNormal.role, "none");

  const stNormal = await QuotaManager.getStatus(normalUser, normalGuild);
  assert.equal(stNormal.isExempt, false);
  assert.equal(stNormal.conversation.maxCapacity, 40);
  assert.equal(stNormal.research.maxCapacity, 20);

  // 3. En DM: Queda sujeto a cuotas normales
  const exDm = await AiExemptionService.hasQuotaExemption(normalUser, null);
  assert.equal(exDm.exempt, false);

  // 4. Embed /ai usage en servidor de pruebas
  const embedTest = QuotaManager.createUsageEmbed(normalUser, "NormalUser", stTest, realTestGuildId);
  const jsonTest = embedTest.toJSON();
  const planField = jsonTest.fields.find(f => f.name.includes("Beneficios Premium"));
  assert.ok(planField.value.includes("Servidor de pruebas exento"), "Debe indicar que el servidor de pruebas está exento");
});

test("4. Validación de cuotas independientes (20/40) y degradación", async () => {
  QuotaManager.clearMemoryStore();
  const testUser = "user_quota_ephem_" + Date.now();
  const normalGuild = "1299943363088355428";

  try {
    // 1. Consumir investigación hasta 0 (20 unidades)
    for (let i = 0; i < 20; i++) {
      const r = await QuotaManager.reserveQuota(testUser, "research", normalGuild);
      assert.equal(r.allowed, true);
    }

    // 21ª investigación denegada
    const r21 = await QuotaManager.reserveQuota(testUser, "research", normalGuild);
    assert.equal(r21.allowed, false);

    // Conversación sigue disponible (40/40)
    let st = await QuotaManager.getStatus(testUser, normalGuild);
    assert.equal(st.research.balance, 0);
    assert.equal(st.conversation.balance, 40);
    assert.equal(st.bothExhausted, false);

    // Consumir 1 de conversación
    const rConv = await QuotaManager.reserveQuota(testUser, "conversation", normalGuild);
    assert.equal(rConv.allowed, true);

    st = await QuotaManager.getStatus(testUser, normalGuild);
    assert.equal(st.conversation.balance, 39);

    // Agotar las 39 restantes de conversación
    for (let i = 0; i < 39; i++) {
      const r = await QuotaManager.reserveQuota(testUser, "conversation", normalGuild);
      assert.equal(r.allowed, true);
    }

    // Ambas agotadas
    st = await QuotaManager.getStatus(testUser, normalGuild);
    assert.equal(st.research.balance, 0);
    assert.equal(st.conversation.balance, 0);
    assert.equal(st.bothExhausted, true);

    // Bloqueo total
    assert.equal((await QuotaManager.reserveQuota(testUser, "research", normalGuild)).allowed, false);
    assert.equal((await QuotaManager.reserveQuota(testUser, "conversation", normalGuild)).allowed, false);
  } finally {
    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (redis) {
      await redis.del("hoshiko:ai_quota:" + testUser).catch(() => null);
    }
  }
});

test("5. Aviso de agotamiento automático emitido una sola vez por ciclo", async () => {
  QuotaManager.clearMemoryStore();
  const testUser = "user_notice_ephem_" + Date.now();

  try {
    assert.equal(await QuotaManager.hasExhaustionNoticeBeenSent(testUser), false);
    await QuotaManager.markExhaustionNoticeSent(testUser);
    assert.equal(await QuotaManager.hasExhaustionNoticeBeenSent(testUser), true);

    // No debe enviar una segunda vez
    assert.equal(await QuotaManager.hasExhaustionNoticeBeenSent(testUser), true);
  } finally {
    const redis = await RedisClientService.ensureClient().catch(() => null);
    if (redis) {
      const cycle = getEcuadorCycleInfo(Date.now());
      await redis.del("hoshiko:ai_exhaust_notice:" + testUser + ":" + cycle.cycleStart).catch(() => null);
    }
  }
});

test("6. Reinicio a las 00:00 hora de Ecuador (America/Guayaquil)", () => {
  const now = Date.now();
  const cycle = getEcuadorCycleInfo(now);

  assert.ok(cycle.cycleStart <= now, "El inicio del ciclo debe ser menor o igual a now");
  assert.ok(cycle.nextRenewalTime > now, "La próxima renovación debe ser estrictamente posterior a now");
  assert.equal(cycle.nextRenewalTime - cycle.cycleStart, 86400000, "La duración del ciclo debe ser exactamente 24 horas");

  // Validar hora de renovación en zona horaria America/Guayaquil
  const renewalDate = new Date(cycle.nextRenewalTime);
  const hourEcuador = renewalDate.toLocaleTimeString("es-EC", {
    timeZone: ECUADOR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  assert.equal(hourEcuador, "00:00", "La renovación debe ocurrir exactamente a las 00:00 hora de Ecuador");
});

test("7. Auditoría de puntos de entrada y clasificación isResearchQuery", () => {
  // Consultas de investigación
  assert.equal(isResearchQuery("busca información sobre el presidente de Ecuador"), true);
  assert.equal(isResearchQuery("investiga el precio de ethereum"), true);
  assert.equal(isResearchQuery("últimas noticias de tecnología"), true);
  assert.equal(isResearchQuery("quién ganó el clásico del astillero"), true);
  assert.equal(isResearchQuery("cuándo sale la temporada 2"), true);

  // Conversaciones normales
  assert.equal(isResearchQuery("hola Hoshiko, ¿cómo te fue hoy?"), false);
  assert.equal(isResearchQuery("me siento un poco cansado de estudiar"), false);
  assert.equal(isResearchQuery("gracias por tu ayuda, eres muy tierna"), false);
});

test("8. Validación de Redis: Operaciones atómicas y rollback", async () => {
  const redis = await RedisClientService.ensureClient().catch(() => null);
  if (!redis) {
    console.log("Redis no disponible en este test, omitiendo paso Redis live");
    return;
  }

  const testUser = "val_redis_atomic_user_333";
  const testGuild = "guild_atomic_test_444";

  try {
    // 1. Reserva conversacional atómica
    const r1 = await QuotaManager.reserveQuota(testUser, "conversation", testGuild);
    assert.equal(r1.allowed, true);

    let st = await QuotaManager.getStatus(testUser, testGuild);
    assert.equal(st.conversation.balance, 39);
    assert.equal(st.research.balance, 20);

    // 2. Rollback atómico
    await QuotaManager.rollbackQuota(testUser, "conversation", testGuild);
    st = await QuotaManager.getStatus(testUser, testGuild);
    assert.equal(st.conversation.balance, 40);
  } finally {
    // Limpieza de datos de prueba
    await redis.del("hoshiko:ai_quota:" + testUser).catch(() => null);
    await redis.quit().catch(() => null);
  }
});
