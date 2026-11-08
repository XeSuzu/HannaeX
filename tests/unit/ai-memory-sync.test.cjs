const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { PersonalMemoryService } = require(path.join(buildDir, "Core/AI/Memory/PersonalMemoryService.js"));
const { ServerEntityMemoryService } = require(path.join(buildDir, "Core/AI/Memory/ServerEntityMemoryService.js"));
const { AiPanelView } = require(path.join(buildDir, "Commands/SlashCmds/AI/aiPanelView.js"));

test("PersonalMemory: addAutoExtractedFact guarda recuerdos individuales con categoría y deduplica", async () => {
  const userId = `test_sync_user_${Date.now()}`;

  // 1. Guardar recuerdo biográfico auto-extraído
  const res1 = await PersonalMemoryService.addAutoExtractedFact(
    userId,
    "Toca la guitarra eléctrica en una banda de rock",
    "biography",
  );
  assert.equal(res1.success, true);
  assert.equal(res1.fact?.source, "auto_extracted");
  assert.equal(res1.fact?.category, "biography");

  // 2. Guardar dinámica de trato/trolleo personal
  const res2 = await PersonalMemoryService.addAutoExtractedFact(
    userId,
    "Tiene sentido del humor sarcástico y disfruta el trato con chicanas",
    "dynamic",
  );
  assert.equal(res2.success, true);
  assert.equal(res2.fact?.category, "dynamic");
  assert.equal(res2.fact?.source, "auto_extracted");

  // 3. Deduplicación: no debe permitir duplicados exactos
  const resDup = await PersonalMemoryService.addAutoExtractedFact(
    userId,
    "Toca la guitarra eléctrica en una banda de rock",
    "biography",
  );
  assert.equal(resDup.success, false);

  // 4. Verificar recuperación de hechos
  const facts = await PersonalMemoryService.getFacts(userId);
  assert.ok(facts.length >= 2);
  assert.ok(facts.some((f) => f.includes("guitarra eléctrica")));
  assert.ok(facts.some((f) => f.includes("chicanas")));
});

test("ServerEntityMemory: Gatekeeper rechaza insultos, chismes y dramas sobre terceros", () => {
  // Datos tóxicos o chismes -> deben ser rechazados (return null)
  assert.equal(ServerEntityMemoryService.extractEntityFact("sabías que Carlos es un idiota y un mentiroso"), null);
  assert.equal(ServerEntityMemoryService.extractEntityFact("te cuento que Lucas se peleó con todos"), null);
  assert.equal(ServerEntityMemoryService.extractEntityFact("sabías que Juan le tiene bronca a Pedro"), null);

  // Datos constructivos y sanos -> deben ser aceptados
  const valid1 = ServerEntityMemoryService.extractEntityFact("sabías que Carlos toca la guitarra eléctrica en el canal de música");
  assert.ok(valid1);
  assert.equal(valid1.entity, "Carlos");
  assert.ok(valid1.fact.includes("toca la guitarra"));

  const valid2 = ServerEntityMemoryService.extractEntityFact("te cuento que Ana trabaja en desarrollo de software");
  assert.ok(valid2);
  assert.equal(valid2.entity, "Ana");
});

test("AiPanelView: Pestaña de recuerdos sincroniza y etiqueta orígenes (auto_extracted, dynamic, explicit)", async () => {
  const userId = `panel_view_user_${Date.now()}`;

  // Añadir un recuerdo automático biográfico
  await PersonalMemoryService.addAutoExtractedFact(userId, "Le gusta el anime de ciencia ficción", "biography");
  // Añadir un recuerdo de dinámica personal
  await PersonalMemoryService.addAutoExtractedFact(userId, "Dinámica de bromas informales", "dynamic");
  // Añadir un recuerdo explícito manual
  await PersonalMemoryService.addExplicitFact(userId, "Mi color favorito es el violeta");

  const ui = await AiPanelView.generate(userId, "TestUser", "https://example.com/avatar.png", "memories");
  assert.ok(ui.embeds.length > 0);
  const desc = ui.embeds[0].data.description;

  // Verificar que renderiza las etiquetas correctas
  assert.ok(desc.includes("*(aprendido en chat)*"), "Debe incluir etiqueta *(aprendido en chat)*");
  assert.ok(desc.includes("*(dinámica de trato)*"), "Debe incluir etiqueta *(dinámica de trato)*");
  assert.ok(desc.includes("*(añadido manual)*"), "Debe incluir etiqueta *(añadido manual)*");

  // Verificar que la pestaña de borrado genera las opciones correspondientes
  const delUi = await AiPanelView.generate(userId, "TestUser", null, "delete_select");
  assert.ok(delUi.components.length > 0);
});
