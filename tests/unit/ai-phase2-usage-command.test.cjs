const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.REDIS_ENABLED = "false";

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const aiCommand = require(path.join(buildDir, "Commands/SlashCmds/AI/ai.js")).default;
const { QuotaManager } = require(path.join(buildDir, "Core/AI/Quota/QuotaManager.js"));

test("Phase 2 - SlashCommand: /ai usage muestra saldos, hora Ecuador y Premium Próximamente", async () => {
  QuotaManager.clearMemoryStore();
  const userId = "u_cmd_test";

  // Simular consumo de 5 conversaciones
  for (let i = 0; i < 5; i++) {
    await QuotaManager.reserveQuota(userId, "conversation");
  }

  let replyPayload = null;
  const mockInteraction = {
    user: { id: userId, username: "AliceDev" },
    options: {
      getSubcommand: () => "usage",
      getSubcommandGroup: () => null,
    },
    reply: async (payload) => {
      replyPayload = payload;
    },
  };

  await aiCommand.execute(mockInteraction);

  assert.notEqual(replyPayload, null);
  assert.equal(replyPayload.ephemeral, true);
  assert.equal(Array.isArray(replyPayload.embeds), true);

  const embedData = replyPayload.embeds[0].data;
  assert.match(embedData.title, /(Consumo y Cuotas|Panel Personal)/i);

  const fields = embedData.fields;
  const convField = fields.find((f) => f.name.includes("Conversaci"));
  assert.notEqual(convField, undefined);
  assert.match(convField.value, /35\s*\/\s*40/);

  const researchField = fields.find((f) => f.name.includes("Investigaci"));
  assert.notEqual(researchField, undefined);
  assert.match(researchField.value, /20\s*\/\s*20/);

  const premiumField = fields.find((f) => f.name.includes("Plan Actual") || f.name.includes("Premium"));
  assert.notEqual(premiumField, undefined);
  assert.match(premiumField.value, /Próximamente/i);

  assert.match(embedData.footer.text, /Ecuador/i);
});
