const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

// Stubs para evitar conexiones de red/Mongo en pruebas unitarias
const { SettingsManager } = require(
  path.join(buildRoot, "Database/guild/SettingsManager.js")
);
let mockSettings = {
  rules: [],
  exemptChannels: [],
  exemptRoles: [],
  securityModules: { securityLevel: 2 },
};
SettingsManager.getSettings = async () => mockSettings;
SettingsManager.updateSettings = async (gid, updates) => {
  mockSettings = { ...mockSettings, ...updates };
  return mockSettings;
};

const { PremiumManager } = require(
  path.join(buildRoot, "Database/guild/PremiumManager.js")
);
let isMockPremium = false;
PremiumManager.isPremium = async () => isMockPremium;

const {
  buildJudgePrompt,
} = require(path.join(buildRoot, "Features/automod/aiJudge.js"));

const {
  validateConfigDraft,
  generateConfigDraftWithAi,
  applyConfigDraft,
} = require(path.join(buildRoot, "Features/automod/aiConfigAssistant.js"));

const {
  summarizeUserHistoryWithAi,
} = require(path.join(buildRoot, "Features/automod/aiHistorySummarizer.js"));

const {
  isAiFeatureAllowed,
} = require(path.join(buildRoot, "Features/automod/aiFeatureGating.js"));

// ─── 1. Tests de Feedback del Staff (Contexto Few-Shot en Prompt) ──────────
test("Feedback del Staff - incluye ejemplos seguros y maliciosos previos en el prompt", () => {
  const staffFeedback = {
    safeExamples: ["buen trabajo amigos", "gg buena partida"],
    confirmedMalicious: ["free nitro scam link", "discord-gift-nitro.com"],
  };

  const promptWithFeedback = buildJudgePrompt(
    "mensaje de prueba",
    { accountAgeDays: 5, joinAgeHours: 1 },
    [],
    [{ id: 1, text: "Sin spam" }],
    staffFeedback
  );

  assert.match(promptWithFeedback, /<feedback_del_staff>/);
  assert.match(promptWithFeedback, /buen trabajo amigos/);
  assert.match(promptWithFeedback, /free nitro scam link/);

  // Sin feedback: el bloque no debe aparecer
  const promptNoFeedback = buildJudgePrompt(
    "mensaje de prueba",
    { accountAgeDays: 5, joinAgeHours: 1 },
    [],
    [{ id: 1, text: "Sin spam" }]
  );
  assert.doesNotMatch(promptNoFeedback, /<feedback_del_staff>/);
});

// ─── 2. Tests del Asistente de Configuración con IA ────────────────────────
test("validateConfigDraft - valida esquema estricto y filtra canales/roles inexistentes", () => {
  const mockGuild = {
    channels: {
      cache: new Map([
        ["chan_valid_1", { id: "chan_valid_1", name: "general" }],
        ["chan_valid_2", { id: "chan_valid_2", name: "bot-spam" }],
      ]),
    },
    roles: {
      cache: new Map([
        ["role_valid_1", { id: "role_valid_1", name: "VIP" }],
      ]),
    },
  };

  const rawAiResponse = {
    preset: 3,
    exemptChannels: ["chan_valid_1", "chan_inventado_404"],
    exemptRoles: ["role_valid_1", "role_fake_999"],
    rules: [
      { id: 1, text: "Respeto mutuo y nada de toxicidad." },
      { id: 2, text: "Sin spam ni autopromoción." },
      { id: 3, text: "   " }, // Regla vacía que debe ser descartada
    ],
    reasoning: "Configuración estricta para comunidad propensa a spam.",
  };

  const { valid, draft } = validateConfigDraft(rawAiResponse, mockGuild);

  assert.equal(valid, true);
  assert.equal(draft.preset, 3);
  assert.deepEqual(draft.exemptChannels, ["chan_valid_1"], "Canal 404 debe ser descartado");
  assert.deepEqual(draft.exemptRoles, ["role_valid_1"], "Rol inexistente debe ser descartado");
  assert.equal(draft.rules.length, 2, "Regla vacía debe ser descartada");
});

test("generateConfigDraftWithAi y applyConfigDraft - genera borrador y requiere confirmación explícita", async () => {
  const mockGuild = {
    id: "guild_assistant_test",
    channels: { cache: new Map() },
    roles: { cache: new Map() },
  };

  const mockRunner = async () =>
    JSON.stringify({
      preset: 2,
      exemptChannels: [],
      exemptRoles: [],
      rules: [{ id: 1, text: "Comunidad amigable de gaming." }],
      reasoning: "Perfil estándar recomendado para gaming.",
    });

  const draft = await generateConfigDraftWithAi({
    guild: mockGuild,
    description: "Servidor de videojuegos",
    mockRunner,
  });

  assert.ok(draft.draftId);
  assert.equal(draft.preset, 2);
  assert.equal(draft.rules[0].text, "Comunidad amigable de gaming.");

  // La IA no aplica sola: verificar que el servidor aún no tiene las reglas aplicadas
  assert.equal(mockSettings.rules.length, 0);

  // Aplicación tras confirmación explícita del staff
  const applyRes = await applyConfigDraft(mockGuild, draft.draftId, "Admin#0001");
  assert.equal(applyRes.success, true);
  assert.equal(mockSettings.rules.length, 1);
  assert.equal(mockSettings.rules[0].text, "Comunidad amigable de gaming.");
});

// ─── 3. Tests del Resumen de Historial con IA ─────────────────────────────
test("summarizeUserHistoryWithAi - resume casos de forma ejecutiva con fallback seguro", async () => {
  // Caso sin casos
  const emptyRes = await summarizeUserHistoryWithAi({
    userId: "user_clean",
    userTag: "Clean#0001",
    cases: [],
  });
  assert.equal(emptyRes.recidivismRisk, "bajo");
  assert.match(emptyRes.summary, /Sin antecedentes/);

  // Caso con casos usando mock
  const mockCases = [
    {
      caseId: 1,
      action: "timeout",
      reason: "Spam reiterado",
      ruleId: 2,
      createdAt: new Date(),
    },
    {
      caseId: 2,
      action: "purge",
      reason: "Inundación de chat",
      ruleId: 2,
      createdAt: new Date(),
    },
  ];

  const mockRunner = async () =>
    JSON.stringify({
      summary: "Usuario con múltiples infracciones leves por spam.",
      recidivismRisk: "medio",
      recommendedNextStep: "Silencio de 2 horas en caso de reincidencia.",
    });

  const res = await summarizeUserHistoryWithAi({
    userId: "user_repeat",
    userTag: "Repeat#0001",
    cases: mockCases,
    mockRunner,
  });

  assert.equal(res.recidivismRisk, "medio");
  assert.match(res.summary, /Usuario con múltiples infracciones/);
  assert.match(res.recommendedNextStep, /Silencio de 2 horas/);
});

// ─── 4. Tests de Feature Gating ───────────────────────────────────────────
test("isAiFeatureAllowed - respeta políticas de características y estado premium", async () => {
  // Funciones libres
  const modGate = await isAiFeatureAllowed("guild_test", "ai_moderation");
  assert.equal(modGate.allowed, true);

  const forensicsGate = await isAiFeatureAllowed("guild_test", "ai_raid_forensics");
  assert.equal(forensicsGate.allowed, true);

  // Característica no existente
  const invalidGate = await isAiFeatureAllowed("guild_test", "inexistente");
  assert.equal(invalidGate.allowed, false);
});
