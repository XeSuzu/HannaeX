const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { PersonalMemoryService } = require(path.join(buildDir, "Core/AI/Memory/PersonalMemoryService.js"));
const PersonalMemoryModel = require(path.join(buildDir, "Database/ai/personalMemory.model.js")).default;

test("Phase 2 - Personal Preferences: Recupera valores por defecto", async () => {
  const originalFindOne = PersonalMemoryModel.findOne;
  PersonalMemoryModel.findOne = async () => null;

  try {
    const prefs = await PersonalMemoryService.getPreferences("user_test_default");
    assert.equal(prefs.style, "balanced");
    assert.equal(prefs.tonePreference, "default");
    assert.equal(prefs.allowVisuals, true);
  } finally {
    PersonalMemoryModel.findOne = originalFindOne;
  }
});

test("Phase 2 - Personal Preferences: Actualización parcial y persistencia", async () => {
  const originalFindOne = PersonalMemoryModel.findOne;
  let savedDoc = null;

  PersonalMemoryModel.findOne = async () => ({
    userId: "user_test_custom",
    preferences: {
      style: "balanced",
      tonePreference: "default",
      allowVisuals: true,
    },
    save: async function () {
      savedDoc = this;
      return this;
    },
  });

  try {
    const updated = await PersonalMemoryService.updatePreferences("user_test_custom", {
      style: "concise",
      allowVisuals: false,
    });

    assert.equal(updated.style, "concise");
    assert.equal(updated.tonePreference, "default"); // No cambió
    assert.equal(updated.allowVisuals, false);
    assert.ok(savedDoc, "Debe haber llamado a save()");
  } finally {
    PersonalMemoryModel.findOne = originalFindOne;
  }
});

test("Phase 2 - Personal Preferences: Zero-Knowledge Logging en actualización", async () => {
  const originalFindOne = PersonalMemoryModel.findOne;
  const originalLog = console.log;
  let loggedAudit = null;

  console.log = (msg) => {
    if (typeof msg === "string" && msg.startsWith("[PRIVACY_AUDIT]")) {
      loggedAudit = JSON.parse(msg.replace("[PRIVACY_AUDIT] ", ""));
    }
  };

  PersonalMemoryModel.findOne = async () => ({
    userId: "u_audit_pref",
    preferences: { style: "balanced", tonePreference: "default", allowVisuals: true },
    save: async () => {},
  });

  try {
    await PersonalMemoryService.updatePreferences("u_audit_pref", { tonePreference: "playful" });
    assert.ok(loggedAudit);
    assert.equal(loggedAudit.eventType, "PREFERENCES_UPDATED");
    assert.equal(loggedAudit.userId, "u_audit_pref");
    assert.equal(loggedAudit.level, "AUDIT");
  } finally {
    PersonalMemoryModel.findOne = originalFindOne;
    console.log = originalLog;
  }
});
