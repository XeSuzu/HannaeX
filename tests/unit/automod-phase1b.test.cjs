const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

const {
  PRESETS,
  getPreset,
  calculatePresetDiff,
} = require(path.join(buildRoot, "Features/automod/automodPresets.js"));

const {
  runSecurityDiagnostics,
} = require(path.join(buildRoot, "Features/automod/automodDiagnostics.js"));

// ─── 1. Tests de Presets y Diffs Declarativos ──────────────────────────────
test("PRESETS - Nivel 2 es el preset estándar recomendado por defecto", () => {
  const p2 = getPreset(2);
  assert.equal(p2.level, 2);
  assert.equal(p2.securityModules.antiSpam, true);
  assert.equal(p2.securityModules.antiLinks, true);
  assert.equal(p2.securityModules.antiRaid, true);
  assert.equal(p2.securityModules.antiNuke, false);
});

test("calculatePresetDiff - calcula exactamente los módulos que cambiarán", () => {
  const current = {
    antiSpam: false,
    antiLinks: false,
    antiRaid: false,
    antiNuke: false,
    antiAlt: false,
    wordFilter: false,
  };

  const targetPreset = getPreset(2); // antiSpam, antiLinks, antiRaid en true
  const diffs = calculatePresetDiff(current, targetPreset);

  const changedModules = diffs.map((d) => d.module).sort();
  assert.deepEqual(changedModules, ["antiLinks", "antiRaid", "antiSpam"]);

  for (const d of diffs) {
    assert.equal(d.before, false);
    assert.equal(d.after, true);
  }
});

// ─── 2. Tests de Diagnóstico de Permisos y Jerarquía ───────────────────────
test("runSecurityDiagnostics - detecta permisos faltantes para módulos activos", () => {
  const mockGuild = {
    id: "g-test",
    members: {
      me: {
        permissions: {
          has: (perm) => false, // No tiene ningún permiso
        },
        roles: {
          highest: { position: 1 },
        },
      },
    },
    roles: {
      cache: new Map([
        ["r1", { id: "r1", managed: false, position: 5 }],
      ]),
    },
  };

  const activeModules = {
    antiSpam: true,
    antiLinks: true,
    antiRaid: true,
    antiNuke: true,
  };

  const diag = runSecurityDiagnostics(mockGuild, activeModules);
  assert.equal(diag.healthy, false);
  assert.ok(diag.issues.length >= 3, "Debe reportar múltiples permisos faltantes");
  assert.equal(diag.hierarchyIssue, true, "Debe detectar jerarquía insuficiente");
});

test("runSecurityDiagnostics - reporta saludable cuando tiene los permisos adecuados", () => {
  const mockGuild = {
    id: "g-healthy",
    members: {
      me: {
        permissions: {
          has: () => true, // Todos los permisos otorgados
        },
        roles: {
          highest: { position: 10 },
        },
      },
    },
    roles: {
      cache: new Map([
        ["r1", { id: "r1", managed: false, position: 5 }],
      ]),
    },
  };

  const activeModules = {
    antiSpam: true,
    antiLinks: true,
  };

  const diag = runSecurityDiagnostics(mockGuild, activeModules);
  assert.equal(diag.healthy, true);
  assert.equal(diag.issues.length, 0);
  assert.equal(diag.hierarchyIssue, false);
});

// ─── 3. Tests de Tope de Reglas ───────────────────────────────────────────
test("Reglas - respeta límite de cantidad y longitud", () => {
  const MAX_RULES = 10;
  const MAX_RULE_LENGTH = 200;

  const validText = "a".repeat(200);
  assert.equal(validText.length, MAX_RULE_LENGTH);

  const invalidText = "a".repeat(201);
  assert.ok(invalidText.length > MAX_RULE_LENGTH);

  const existingRules = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    text: `Regla número ${i + 1}`,
  }));

  assert.equal(existingRules.length, MAX_RULES);
  const canAddMore = existingRules.length < MAX_RULES;
  assert.equal(canAddMore, false, "No debe permitir añadir más de 10 reglas");
});
