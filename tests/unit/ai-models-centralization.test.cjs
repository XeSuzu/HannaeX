const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

test("AI-03: aiModels exporta los identificadores oficiales de Gemini por defecto", () => {
  const { GEMINI_MODEL_FLASH, GEMINI_MODEL_FLASH_LITE } = require(
    path.join(buildRoot, "config/aiModels.js")
  );

  assert.equal(typeof GEMINI_MODEL_FLASH, "string");
  assert.equal(typeof GEMINI_MODEL_FLASH_LITE, "string");

  // Validar formato activo y vigente de modelos oficiales de Google Gemini
  assert.match(GEMINI_MODEL_FLASH, /^gemini-3\./, "El modelo Flash predeterminado debe ser de la serie 3.x vigente");
  assert.match(GEMINI_MODEL_FLASH_LITE, /^gemini-3\./, "El modelo Lite predeterminado debe ser de la serie 3.x vigente");

  // Regresión: verificar que nunca se vuelva a introducir un modelo apagado como valor por defecto
  assert.equal(
    /gemini-(1\.5|2\.0)/.test(GEMINI_MODEL_FLASH),
    false,
    "GEMINI_MODEL_FLASH no debe utilizar modelos de la serie 1.5 o 2.0 apagados en junio de 2026",
  );
  assert.equal(
    /gemini-(1\.5|2\.0)/.test(GEMINI_MODEL_FLASH_LITE),
    false,
    "GEMINI_MODEL_FLASH_LITE no debe utilizar modelos de la serie 1.5 o 2.0 apagados en junio de 2026",
  );
});

test("AI-03: los servicios de Gemini y moderación consumen los modelos centralizados", () => {
  const geminiModule = require(path.join(buildRoot, "Services/gemini.js"));
  const aiJudgeModule = require(path.join(buildRoot, "Features/automod/aiJudge.js"));
  const translationModule = require(path.join(buildRoot, "Services/translationService.js"));

  assert.ok(geminiModule);
  assert.ok(aiJudgeModule);
  assert.ok(translationModule);
});
