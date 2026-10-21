const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

// Stub de configuración para pruebas unitarias sin MongoDB activo
const { SettingsManager } = require(
  path.join(buildRoot, "Database/guild/SettingsManager.js")
);
SettingsManager.getSettings = async () => ({
  securityModules: { securityLevel: 2, antiSpam: true },
});

const {
  buildNormalizedFingerprint,
  recordMessageOccurrenceSync,
  resetRepeatedMessages,
  isTextWall,
  evaluateMassMentions,
  PROFILES,
  addServerStressSafe,
} = require(path.join(buildRoot, "Features/automod/automodState.js"));

const { RateLimiter } = require(
  path.join(buildRoot, "Security/Defense/RateLimiter.js")
);

// ─── 1. Tests de Normalización de Huellas (Principio 4.1) ───────────────────
test("buildNormalizedFingerprint - colapsa espacios y normaliza sin unificar palabras distintas", () => {
  const f1 = buildNormalizedFingerprint("hola mundo");
  const f2 = buildNormalizedFingerprint("holamundo");
  assert.notEqual(f1, f2, "hola mundo y holamundo NO deben tener la misma huella");

  const fMultipleSpaces = buildNormalizedFingerprint("hola    mundo   ");
  assert.equal(fMultipleSpaces, f1, "Espacios múltiples deben colapsar al espacio estándar");
});

test("buildNormalizedFingerprint - elimina caracteres invisibles y mayúsculas", () => {
  const base = buildNormalizedFingerprint("mensaje de prueba largo");
  const withInvisible = buildNormalizedFingerprint("m\u200Bensaje \uFEFFde pru\u200Deba largo");
  const withUpper = buildNormalizedFingerprint("MENSAJE DE PRUEBA LARGO");

  assert.equal(withInvisible, base, "Caracteres invisibles no deben evadir la huella");
  assert.equal(withUpper, base, "Mayúsculas deben normalizarse a minúsculas");
});

test("buildNormalizedFingerprint - mensajes ultra-cortos sin adjuntos devuelven null", () => {
  assert.equal(buildNormalizedFingerprint("ok"), null);
  assert.equal(buildNormalizedFingerprint("si"), null);
  assert.equal(buildNormalizedFingerprint(""), null);
});

// ─── 2. Tests de Repetición Mono-Cuenta en Mismo Canal ─────────────────────
test("recordMessageOccurrenceSync - detecta repeticiones en el mismo canal con reloj inyectado", () => {
  const guildId = "g-repeat-1";
  const userId = "u-spammer-1";
  const channelId = "c-general";
  const content = "Este es un mensaje repetitivo de prueba para raid";
  const t0 = 1000000;

  // 1ª ocurrencia
  const r1 = recordMessageOccurrenceSync(guildId, userId, "m1", channelId, content, [], t0);
  assert.equal(r1.count, 1);

  // 2ª ocurrencia (3s después)
  const r2 = recordMessageOccurrenceSync(guildId, userId, "m2", channelId, content, [], t0 + 3000);
  assert.equal(r2.count, 2);

  // 3ª ocurrencia (6s después) -> alcanza deleteAt en modo normal
  const r3 = recordMessageOccurrenceSync(guildId, userId, "m3", channelId, content, [], t0 + 6000);
  assert.equal(r3.count, 3);
  assert.ok(r3.count >= PROFILES.normal.repeat.deleteAt);
  assert.equal(r3.occurrences.length, 3);

  // 4ª ocurrencia (8s después) -> alcanza timeoutAt en modo normal
  const r4 = recordMessageOccurrenceSync(guildId, userId, "m4", channelId, content, [], t0 + 8000);
  assert.equal(r4.count, 4);
  assert.ok(r4.count >= PROFILES.normal.repeat.timeoutAt);

  // Limpieza
  resetRepeatedMessages(guildId, userId, r4.fingerprint);
});

test("recordMessageOccurrenceSync - expira ocurrencias fuera de la ventana de 30s", () => {
  const guildId = "g-repeat-window";
  const userId = "u-slow-user";
  const channelId = "c-general";
  const content = "Texto repetido pero muy espaciado";
  const t0 = 2000000;

  recordMessageOccurrenceSync(guildId, userId, "m1", channelId, content, [], t0);
  recordMessageOccurrenceSync(guildId, userId, "m2", channelId, content, [], t0 + 10000);

  // 35 segundos después de m1 (m1 ya expiró)
  const r3 = recordMessageOccurrenceSync(guildId, userId, "m3", channelId, content, [], t0 + 35000);
  assert.equal(r3.count, 2, "La primera ocurrencia debió expirar tras 30s");
});

// ─── 3. Tests de Muro de Texto (isTextWall) ────────────────────────────────
test("isTextWall - detecta exceso de saltos de línea y repetición masiva de caracteres", () => {
  // 11 saltos de línea en texto mediano
  const wallNewlines = "linea\n".repeat(11) + "fin del mensaje mediano de prueba";
  assert.equal(isTextWall(wallNewlines), true);

  // Mensaje normal de 200 caracteres con 2 saltos
  const normalText = "Hola a todos, este es un mensaje perfectamente normal y descriptivo dentro de una conversación cotidiana. Tiene suficiente longitud pero ningún patrón sospechoso ni saltos excesivos.\nSaludos a todos.";
  assert.equal(isTextWall(normalText), false);

  // Repetición exagerada de un carácter (60%+ de un solo carácter en > 200 chars)
  const repeatedChar = "a".repeat(150) + "b".repeat(60);
  assert.equal(isTextWall(repeatedChar), true);
});

// ─── 4. Tests de Menciones Masivas (evaluateMassMentions) ──────────────────
test("evaluateMassMentions - intento inerte de @everyone sin permiso borra sin timeout", () => {
  const res = evaluateMassMentions(
    "atención @everyone lean esto",
    { everyone: false, usersCount: 0, rolesCount: 0 },
    false, // No tiene permiso
    false, // Modo normal
  );

  assert.ok(res);
  assert.equal(res.action, "delete");
  assert.equal(res.timeoutMs, 0);
  assert.equal(res.type, "unauthorized_everyone");
});

test("evaluateMassMentions - ping real no autorizado de @everyone aplica delete + timeout", () => {
  const res = evaluateMassMentions(
    "@everyone emergencia",
    { everyone: true, usersCount: 0, rolesCount: 0 },
    false, // Sin permiso administrativo de mention everyone
    false, // Modo normal
  );

  assert.ok(res);
  assert.equal(res.action, "delete+timeout");
  assert.ok(res.timeoutMs > 0);
  assert.equal(res.type, "everyone_ping");
});

test("evaluateMassMentions - supera límite de menciones en modo normal y modo raid", () => {
  // 5 menciones en modo normal (límite: 5) -> borrado sin timeout
  const resNormal = evaluateMassMentions(
    "hola a todos los usuarios",
    { everyone: false, usersCount: 5, rolesCount: 0 },
    false,
    false, // modo normal
  );
  assert.ok(resNormal);
  assert.equal(resNormal.action, "delete");

  // 3 menciones en modo raid (límite: 3) -> borrado + timeout
  const resRaid = evaluateMassMentions(
    "spam de raid",
    { everyone: false, usersCount: 3, rolesCount: 0 },
    false,
    true, // modo raid
  );
  assert.ok(resRaid);
  assert.equal(resRaid.action, "delete+timeout");
  assert.equal(resRaid.timeoutMs, 10 * 60_000);
});

// ─── 5. Tests de Estrés Seguro (addServerStressSafe, Principio 4.5) ────────
test("addServerStressSafe - limita la contribución máxima por usuario a 30 pts por ventana", async () => {
  const guildId = "g-stress-safe";
  const userId = "u-spammer-stress";

  // Intentar sumar 20 pts dos veces en la misma ventana
  const s1 = await addServerStressSafe(guildId, userId, 20);
  const s2 = await addServerStressSafe(guildId, userId, 20);

  // El segundo llamado solo debe permitir hasta +10 pts (máximo 30 total en la ventana)
  assert.ok(s2.score <= 30, `El atacante no debe poder superar 30 pts de contribución directa (obtenido: ${s2.score})`);
});

// ─── 6. Tests de RateLimiter con LocalCacheService ────────────────────────
test("RateLimiter - expira y resetea correctamente usando LocalCacheService", () => {
  const userId = "u-ratelimit-test";
  RateLimiter.reset(userId);

  for (let i = 0; i < 5; i++) {
    assert.equal(RateLimiter.isSpamming(userId, 5, 5000), false);
  }
  // 6º mensaje supera el límite de 5
  assert.equal(RateLimiter.isSpamming(userId, 5, 5000), true);

  RateLimiter.reset(userId);
  assert.equal(RateLimiter.isSpamming(userId, 5, 5000), false);
});
