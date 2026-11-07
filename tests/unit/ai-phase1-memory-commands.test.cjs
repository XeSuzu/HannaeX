const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const clearmemoryCmd = require(path.join(buildDir, "Commands/SlashCmds/Moderation/clearmemory.js")).default;
const memoryCmd = require(path.join(buildDir, "Commands/SlashCmds/Utility/memory.js")).default;
const { PersonalMemoryService } = require(path.join(buildDir, "Core/AI/Memory/PersonalMemoryService.js"));
const { UserMemoryManager } = require(path.join(buildDir, "Database/ai/UserMemoryManager.js"));
const PersonalMemoryModel = require(path.join(buildDir, "Database/ai/personalMemory.model.js")).default;

test("Fase 1: clearmemoryall - Confirmación de retiro de comando administrativo ordinario", () => {
  const clearmemoryallPath = path.join(buildDir, "Commands/SlashCmds/Moderation/clearmemoryall.js");
  const exists = fs.existsSync(clearmemoryallPath);
  assert.equal(
    exists,
    false,
    "clearmemoryall.js debe haber sido retirado del código para proteger la soberanía de memoria del usuario",
  );
});

test("Fase 1: clearmemory - borra los recuerdos soberanos del usuario invocador", async () => {
  let clearedUserId = null;
  const originalClearAllFacts = PersonalMemoryService.clearAllFacts;
  PersonalMemoryService.clearAllFacts = async (userId) => {
    clearedUserId = userId;
    return true;
  };

  try {
    let replyContent = "";
    const fakeInteraction = {
      guild: { id: "guild_123" },
      user: { id: "user_456" },
      editReply: async (payload) => {
        replyContent = typeof payload === "string" ? payload : payload.content;
      },
    };

    await clearmemoryCmd.execute(fakeInteraction, {});

    assert.equal(clearedUserId, "user_456", "clearmemory debe invocar clearAllFacts para el usuario invocador");
    assert.match(replyContent, /borré todo lo que sabía sobre ti/i);
  } finally {
    PersonalMemoryService.clearAllFacts = originalClearAllFacts;
  }
});

test("Fase 1: /memory subcomandos (ver, guardar, borrar, ajustes, legados)", async () => {
  let capturedReply = null;
  const fakeInteraction = {
    guild: { id: "guild_123" },
    user: {
      id: "user_789",
      username: "Valen",
      displayAvatarURL: () => "https://cdn.discordapp.com/avatars/user.png",
    },
    client: {
      user: {
        displayAvatarURL: () => "https://cdn.discordapp.com/avatars/bot.png",
      },
    },
    options: {
      subcommand: "ver",
      getSubcommand: () => fakeInteraction.options.subcommand,
      getString: (name) => fakeInteraction.options.strings[name],
      getInteger: (name) => fakeInteraction.options.ints[name],
      strings: {},
      ints: {},
    },
    editReply: async (payload) => {
      capturedReply = payload;
      return payload;
    },
  };

  const originalFindOne = PersonalMemoryModel.findOne;
  PersonalMemoryModel.findOne = async () => null;
  const originalGetMemory = PersonalMemoryService.getMemory;
  PersonalMemoryService.getMemory = async () => null;
  const originalToggle = PersonalMemoryService.toggleMemory;
  let toggledState = null;
  PersonalMemoryService.toggleMemory = async (uid, enabled) => {
    toggledState = enabled;
    return true;
  };

  try {
    // 1. /memory ver - sin recuerdos
    fakeInteraction.options.subcommand = "ver";
    await memoryCmd.execute(fakeInteraction);
    assert.match(capturedReply.content, /No tienes recuerdos personales/i);

    // 2. /memory guardar - sensible rechazado
    fakeInteraction.options.subcommand = "guardar";
    fakeInteraction.options.strings["recuerdo"] = "mi password: supersecreto123";
    await memoryCmd.execute(fakeInteraction);
    assert.match(capturedReply.content, /no puede almacenar contraseñas/i);

    // 3. /memory ajustes - activar/desactivar
    fakeInteraction.options.subcommand = "ajustes";
    fakeInteraction.options.strings["estado"] = "desactivada";
    await memoryCmd.execute(fakeInteraction);
    assert.equal(toggledState, false);
    assert.match(capturedReply.content, /desactivada/i);
  } finally {
    PersonalMemoryModel.findOne = originalFindOne;
    PersonalMemoryService.getMemory = originalGetMemory;
    PersonalMemoryService.toggleMemory = originalToggle;
  }
});

test("Fase 1: UserMemoryManager guardas ante IDs vacíos", async () => {
  assert.equal(await UserMemoryManager.clearMemory("", "guild_1"), false);
  assert.equal(await UserMemoryManager.clearMemory("user_1", ""), false);
  assert.equal(await UserMemoryManager.clearGuildMemory(""), false);
});
