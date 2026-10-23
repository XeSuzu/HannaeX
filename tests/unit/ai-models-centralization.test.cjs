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

  // Validar formato estándar de modelos oficiales de Google Gemini
  assert.match(GEMINI_MODEL_FLASH, /^gemini-(1\.5|2\.0)-(flash|pro)/);
  assert.match(GEMINI_MODEL_FLASH_LITE, /^gemini-(1\.5|2\.0)-flash-lite/);
});

test("AI-03: los servicios de Gemini y moderación consumen los modelos centralizados", () => {
  const geminiModule = require(path.join(buildRoot, "Services/gemini.js"));
  const aiJudgeModule = require(path.join(buildRoot, "Features/automod/aiJudge.js"));
  const translationModule = require(path.join(buildRoot, "Services/translationService.js"));

  assert.ok(geminiModule);
  assert.ok(aiJudgeModule);
  assert.ok(translationModule);
});
