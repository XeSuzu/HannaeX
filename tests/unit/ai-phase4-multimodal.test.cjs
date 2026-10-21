const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { buildConversationContext, MAX_IMAGE_SIZE_BYTES, SUPPORTED_IMAGE_MIMES } = require(path.join(buildDir, "Features/ai/conversationContext.js"));
const { UserMemoryManager } = require(path.join(buildDir, "Database/ai/UserMemoryManager.js"));

test("Fase 4: MAX_IMAGE_SIZE_BYTES y SUPPORTED_IMAGE_MIMES definidos correctamente", () => {
  assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);
  assert.ok(SUPPORTED_IMAGE_MIMES.has("image/png"));
  assert.ok(SUPPORTED_IMAGE_MIMES.has("image/jpeg"));
  assert.ok(SUPPORTED_IMAGE_MIMES.has("image/webp"));
  assert.equal(SUPPORTED_IMAGE_MIMES.has("image/gif"), false, "GIF animado no se procesa como imagen estática");
});

test("Fase 4: buildConversationContext rechaza formato no soportado sin crashear", async () => {
  const originalGetFacts = UserMemoryManager.getFacts;
  UserMemoryManager.getFacts = async () => [];

  try {
    const fakeMessage = {
      guild: { id: "guild_1", name: "Servidor Test" },
      author: { id: "user_1", username: "carlos" },
      content: "mira esto",
      channel: {
        messages: {
          fetch: async () => new Map(),
        },
      },
      attachments: {
        size: 1,
        first: () => ({
          url: "http://example.com/test.bmp",
          contentType: "image/bmp",
          size: 1024,
        }),
      },
    };

    const fakeClient = { user: { id: "bot_123" } };
    const fakeConfig = { aiSystem: { mode: "neko", behavior: "normal" } };

    const ctx = await buildConversationContext(fakeMessage, fakeClient, fakeConfig, {
      isPremium: false,
      isMentioned: true,
      prefixMatch: false,
      isReplyToMe: false,
      isRandomTrigger: false,
    });

    const lastTurn = ctx.historyForApi[ctx.historyForApi.length - 1];
    assert.match(lastTurn.parts[0].text, /Formato de imagen no compatible/);
    assert.equal(lastTurn.parts.length, 1, "No debe incluir inlineData si no es compatible");
  } finally {
    UserMemoryManager.getFacts = originalGetFacts;
  }
});

test("Fase 4: buildConversationContext rechaza imagen que excede 5MB antes de descargar", async () => {
  const originalGetFacts = UserMemoryManager.getFacts;
  UserMemoryManager.getFacts = async () => [];

  try {
    const fakeMessage = {
      guild: { id: "guild_1", name: "Servidor Test" },
      author: { id: "user_1", username: "carlos" },
      content: "mira esto",
      channel: {
        messages: {
          fetch: async () => new Map(),
        },
      },
      attachments: {
        size: 1,
        first: () => ({
          url: "http://example.com/huge.png",
          contentType: "image/png",
          size: 10 * 1024 * 1024, // 10MB
        }),
      },
    };

    const fakeClient = { user: { id: "bot_123" } };
    const fakeConfig = { aiSystem: { mode: "neko", behavior: "normal" } };

    const ctx = await buildConversationContext(fakeMessage, fakeClient, fakeConfig, {
      isPremium: false,
      isMentioned: true,
      prefixMatch: false,
      isReplyToMe: false,
      isRandomTrigger: false,
    });

    const lastTurn = ctx.historyForApi[ctx.historyForApi.length - 1];
    assert.match(lastTurn.parts[0].text, /excede el límite de 5MB/);
    assert.equal(lastTurn.parts.length, 1, "No debe incluir inlineData si excede el tamaño");
  } finally {
    UserMemoryManager.getFacts = originalGetFacts;
  }
});
