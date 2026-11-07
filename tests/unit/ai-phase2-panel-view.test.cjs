const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { AiPanelView } = require(path.join(buildDir, "Commands/SlashCmds/AI/aiPanelView.js"));
const { PersonalMemoryService } = require(path.join(buildDir, "Core/AI/Memory/PersonalMemoryService.js"));
const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));

test("Phase 2 - AiPanelView: Genera la vista principal (main) con barras de progreso y botones", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "u_panel_test";

  const panel = await AiPanelView.generate(userId, "AliceUser", null, "main");
  assert.equal(panel.embeds.length, 1);
  assert.equal(panel.components.length, 2);

  const embed = panel.embeds[0].data;
  assert.match(embed.title, /Panel Personal de Hoshiko AI/i);
  assert.ok(embed.fields.some((f) => f.name.includes("Conversación Diaria")));
  assert.ok(embed.fields.some((f) => f.name.includes("Investigación")));
  assert.ok(embed.fields.some((f) => f.name.includes("Personal Mode")));
  assert.ok(embed.fields.some((f) => f.name.includes("Memoria Soberana")));

  // Botones de acción presentes
  const buttonsRow1 = panel.components[0].components;
  assert.ok(buttonsRow1.some((b) => b.data.custom_id === "ai_tab_style"));
  assert.ok(buttonsRow1.some((b) => b.data.custom_id === "ai_toggle_images"));
  assert.ok(buttonsRow1.some((b) => b.data.custom_id === "ai_tab_memories"));
});

test("Phase 2 - AiPanelView: Genera la vista de cambio de estilo (style)", async () => {
  const userId = "u_panel_test";
  const panel = await AiPanelView.generate(userId, "AliceUser", null, "style");

  assert.equal(panel.embeds.length, 1);
  assert.match(panel.embeds[0].data.title, /Ajustar Estilo de Conversación/i);

  const styleButtons = panel.components[0].components;
  assert.ok(styleButtons.some((b) => b.data.custom_id === "ai_set_concise"));
  assert.ok(styleButtons.some((b) => b.data.custom_id === "ai_set_balanced"));
  assert.ok(styleButtons.some((b) => b.data.custom_id === "ai_set_detailed"));
  assert.ok(styleButtons.some((b) => b.data.custom_id === "ai_tab_main"));
});

test("Phase 2 - AiPanelView: Genera la vista de recuerdos y borrado", async () => {
  const userId = "u_panel_test";
  const panelMemories = await AiPanelView.generate(userId, "AliceUser", null, "memories");
  assert.match(panelMemories.embeds[0].data.title, /Tus Recuerdos Personales/i);

  const panelDelSelect = await AiPanelView.generate(userId, "AliceUser", null, "delete_select");
  assert.match(panelDelSelect.embeds[0].data.title, /Eliminar un Recuerdo/i);
  assert.equal(panelDelSelect.components.length, 2);
});
