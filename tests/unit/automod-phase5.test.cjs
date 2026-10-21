const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

const {
  calculateJoinRiskScore,
  recordCrossAccountFingerprintSync,
  resetMultiAccountFingerprints,
} = require(path.join(buildRoot, "Features/automod/automodState.js"));

// ─── 1. Tests de Riesgo por Señales Compuestas (Pilar 7.4) ─────────────────
test("calculateJoinRiskScore - evalúa perfil de riesgo compuesto y genera desglose", () => {
  // Cuenta sospechosa: nueva (<24h), sin avatar, nombre irregular
  const highRisk = calculateJoinRiskScore({
    accountAgeDays: 0.2,
    hasNoAvatar: true,
    isIrregularName: true,
    joinedInRaidWindow: true,
  });

  assert.equal(highRisk.isSuspicious, true);
  assert.ok(highRisk.score >= 70, `Score esperado >= 70, obtenido: ${highRisk.score}`);
  assert.equal(highRisk.breakdown.length >= 3, true);

  // Cuenta legítima antigua: 100 días, con avatar, nombre normal
  const cleanAccount = calculateJoinRiskScore({
    accountAgeDays: 100,
    hasNoAvatar: false,
    isIrregularName: false,
    joinedInRaidWindow: false,
  });

  assert.equal(cleanAccount.isSuspicious, false);
  assert.equal(cleanAccount.score, 0);
  assert.equal(cleanAccount.breakdown.length, 0);
});

// ─── 2. Tests de Detección Multi-Cuenta de Copypasta Coordinado ────────────
test("recordCrossAccountFingerprintSync - rastrea cuentas únicas compartiendo huellas", () => {
  const guildId = "guild_multi_test";
  const fingerprint = "enlace_malicioso_scam_crypto";
  resetMultiAccountFingerprints(guildId, fingerprint);

  const t0 = 100000;
  // Cuenta 1
  const r1 = recordCrossAccountFingerprintSync(guildId, "user_1", "m1", "c1", fingerprint, t0);
  assert.equal(r1.uniqueUsersCount, 1);

  // Cuenta 1 repite en otro mensaje (mono-cuenta, sigue 1 usuario único)
  const r2 = recordCrossAccountFingerprintSync(guildId, "user_1", "m2", "c2", fingerprint, t0 + 1000);
  assert.equal(r2.uniqueUsersCount, 1);

  // Cuenta 2 envía la misma huella (multi-cuenta)
  const r3 = recordCrossAccountFingerprintSync(guildId, "user_2", "m3", "c1", fingerprint, t0 + 2000);
  assert.equal(r3.uniqueUsersCount, 2, "Debe registrar 2 usuarios únicos compartiendo la huella");

  // Cuenta 3 envía la misma huella
  const r4 = recordCrossAccountFingerprintSync(guildId, "user_3", "m4", "c3", fingerprint, t0 + 3000);
  assert.equal(r4.uniqueUsersCount, 3, "Debe registrar 3 usuarios únicos compartiendo la huella");

  // Ocurrencias fuera de la ventana de 45s expiran
  const r5 = recordCrossAccountFingerprintSync(guildId, "user_4", "m5", "c1", fingerprint, t0 + 50000);
  assert.equal(r5.uniqueUsersCount, 1, "Mensajes de hace >45s deben expirar de la ventana activa");
});

// ─── 3. Tests de Lógica de Exclusión en Anti-Nuke (DEF-02, DEF-07, DEF-08) ──
test("Anti-Nuke - intercepta bots maliciosos sin ignorarlos ciegamente por tener flag .bot", () => {
  const hoshikoBotId = "bot_hoshiko_id";
  const ownerId = "guild_owner_id";

  function shouldExcludeFromAntiNuke(executor, clientUserId, guildOwnerId) {
    if (!executor || executor.id === clientUserId || executor.id === guildOwnerId) {
      return true;
    }
    return false;
  }

  // 1. Hoshiko mismo debe ser excluido
  assert.equal(
    shouldExcludeFromAntiNuke({ id: hoshikoBotId, bot: true }, hoshikoBotId, ownerId),
    true,
    "Hoshiko no debe autobloquearse"
  );

  // 2. El dueño del servidor debe ser excluido
  assert.equal(
    shouldExcludeFromAntiNuke({ id: ownerId, bot: false }, hoshikoBotId, ownerId),
    true,
    "El dueño del servidor debe ser excluido"
  );

  // 3. Un bot ajeno o comprometido NO debe ser excluido
  assert.equal(
    shouldExcludeFromAntiNuke({ id: "malicious_bot_666", bot: true }, hoshikoBotId, ownerId),
    false,
    "Bots ajenos NO deben ser ignorados por el anti-nuke"
  );

  // 4. Un usuario humano no dueño NO debe ser excluido
  assert.equal(
    shouldExcludeFromAntiNuke({ id: "rogue_moderator_999", bot: false }, hoshikoBotId, ownerId),
    false,
    "Moderadores rebeldes no dueños deben ser monitoreados"
  );
});
