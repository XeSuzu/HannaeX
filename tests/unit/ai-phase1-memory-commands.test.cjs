const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const clearmemoryCmd = require(path.join(buildDir, "Commands/SlashCmds/Moderation/clearmemory.js")).default;
const clearmemoryallCmd = require(path.join(buildDir, "Commands/SlashCmds/Moderation/clearmemoryall.js")).default;
const { UserMemoryManager } = require(path.join(buildDir, "Database/ai/UserMemoryManager.js"));
const UserMemoryModel = require(path.join(buildDir, "Database/ai/userMemory.model.js")).default;

test("Fase 1: clearmemory - borra solo recuerdos del usuario invocador y no del servidor", async () => {
  let deleteOneCalledWith = null;
  let deleteManyCalled = false;

  const originalDeleteOne = UserMemoryModel.deleteOne;
  const originalDeleteMany = UserMemoryModel.deleteMany;

  UserMemoryModel.deleteOne = async (query) => {
    deleteOneCalledWith = query;
    return { deletedCount: 1 };
  };
  UserMemoryModel.deleteMany = async () => {
    deleteManyCalled = true;
    return { deletedCount: 5 };
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

    assert.equal(deleteManyCalled, false, "clearmemory NO debe llamar a deleteMany (no debe borrar el servidor)");
    assert.deepEqual(deleteOneCalledWith, { userId: "user_456", guildId: "guild_123" });
    assert.match(replyContent, /borré todo lo que sabía sobre ti/i);
  } finally {
    UserMemoryModel.deleteOne = originalDeleteOne;
    UserMemoryModel.deleteMany = originalDeleteMany;
  }
});

test("Fase 1: clearmemoryall - rechaza a usuario común sin permisos", async () => {
  let deleteManyCalled = false;
  const originalDeleteMany = UserMemoryModel.deleteMany;
  UserMemoryModel.deleteMany = async () => {
    deleteManyCalled = true;
    return { deletedCount: 10 };
  };

  try {
    let replyContent = "";
    const fakeInteraction = {
      guild: { id: "guild_123", ownerId: "owner_999" },
      user: { id: "user_regular" },
      memberPermissions: {
        has: () => false, // No tiene permisos
      },
      editReply: async (payload) => {
        replyContent = typeof payload === "string" ? payload : payload.content;
      },
    };

    await clearmemoryallCmd.execute(fakeInteraction, { application: { owner: { id: "bot_owner_777" } } });

    assert.equal(deleteManyCalled, false, "No debe borrar si el usuario no tiene permisos");
    assert.match(replyContent, /No tienes permisos suficientes/i);
  } finally {
    UserMemoryModel.deleteMany = originalDeleteMany;
  }
});

test("Fase 1: clearmemoryall - permite a administrador y borra toda la memoria del servidor", async () => {
  let deleteManyCalledWith = null;
  const originalDeleteMany = UserMemoryModel.deleteMany;
  UserMemoryModel.deleteMany = async (query) => {
    deleteManyCalledWith = query;
    return { deletedCount: 15 };
  };

  try {
    let replyContent = "";
    const fakeInteraction = {
      guild: { id: "guild_123", ownerId: "owner_999" },
      user: { id: "user_admin" },
      memberPermissions: {
        has: (perm) => true, // Tiene ManageGuild / Admin
      },
      editReply: async (payload) => {
        replyContent = typeof payload === "string" ? payload : payload.content;
      },
    };

    await clearmemoryallCmd.execute(fakeInteraction, { application: { owner: { id: "bot_owner_777" } } });

    assert.deepEqual(deleteManyCalledWith, { guildId: "guild_123" });
    assert.match(replyContent, /Memoria del servidor borrada/i);
  } finally {
    UserMemoryModel.deleteMany = originalDeleteMany;
  }
});

test("Fase 1: UserMemoryManager guardas ante IDs vacíos", async () => {
  assert.equal(await UserMemoryManager.clearMemory("", "guild_1"), false);
  assert.equal(await UserMemoryManager.clearMemory("user_1", ""), false);
  assert.equal(await UserMemoryManager.clearGuildMemory(""), false);
});
