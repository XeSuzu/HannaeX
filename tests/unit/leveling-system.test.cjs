const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

const {
  activeSessions,
  initVoiceSessionClient,
  rehydrateVoiceSessions,
  processActiveVoiceInterval,
} = require(path.join(buildDir, "Events/Client/handlers/voice/voiceManager.js"));
const {
  handleVoiceStateChange,
} = require(path.join(buildDir, "Events/Client/handlers/voice/voiceLifecycle.js"));
const ActiveVoiceSession = require(
  path.join(buildDir, "Database/leveling/activeVoiceSession.model.js"),
).default;
const LocalLevel = require(
  path.join(buildDir, "Database/leveling/localLevel.model.js"),
).default;
const { LevelConfigCache } = require(
  path.join(buildDir, "Database/leveling/LevelConfigCache.js"),
);
const { handleLevelXp } = require(
  path.join(buildDir, "Features/leveling/textXp.js"),
);
const {
  LEVEL_CARD_THEMES,
  resolveCardBackgroundTheme,
} = require(path.join(buildDir, "Utils/LevelBanners.js"));

test("LevelCardCustomization: resuelve fondos predefinidos y hace fallback a default", () => {
  assert.equal(resolveCardBackgroundTheme("sakura").id, "sakura");
  assert.equal(resolveCardBackgroundTheme("cyberpunk").id, "cyberpunk");
  assert.equal(resolveCardBackgroundTheme("inexistente").id, "default");
  assert.equal(resolveCardBackgroundTheme(undefined).id, "default");
  assert.ok(Object.keys(LEVEL_CARD_THEMES).length >= 5);
});

test("VoiceLifecycle: inicia y cierra sesiones para ambos usuarios cuando entra/sale el segundo acompañante", async () => {
  activeSessions.clear();

  const origUpdate = ActiveVoiceSession.findOneAndUpdate;
  const origDelete = ActiveVoiceSession.deleteOne;
  ActiveVoiceSession.findOneAndUpdate = async () => ({});
  ActiveVoiceSession.deleteOne = async () => ({});

  try {
    const guildId = "guild-vc-1";
    const channelMembers = new Map();

    const makeMember = (id, muted = false) => ({
      id,
      user: { bot: false, username: id },
      guild: { id: guildId, afkChannelId: null, name: "TestGuild" },
      roles: { cache: new Map() },
      voice: {
        channelId: "vc-1",
        selfMute: muted,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
        get channel() {
          return channel;
        },
      },
    });

    const channel = {
      id: "vc-1",
      members: {
        filter: (fn) => {
          const filtered = [...channelMembers.values()].filter(fn);
          return { size: filtered.length };
        },
        [Symbol.iterator]: function* () {
          yield* channelMembers.entries();
        },
      },
    };

    const userA = makeMember("user-a");
    channelMembers.set("user-a", userA);

    // Usuario A entra solo -> 0 sesiones
    await handleVoiceStateChange(
      { channelId: null, channel: null, member: userA, guild: { id: guildId } },
      { channelId: "vc-1", channel, member: userA, guild: { id: guildId } },
    );
    assert.equal(activeSessions.size, 0);

    // Usuario B entra -> se deben activar sesiones tanto para A como para B
    const userB = makeMember("user-b");
    channelMembers.set("user-b", userB);

    await handleVoiceStateChange(
      { channelId: null, channel: null, member: userB, guild: { id: guildId } },
      { channelId: "vc-1", channel, member: userB, guild: { id: guildId } },
    );

    assert.equal(activeSessions.has(`user-a:${guildId}`), true);
    assert.equal(activeSessions.has(`user-b:${guildId}`), true);

    // Usuario B se desconecta -> se deben cerrar las sesiones de ambos (A queda solo)
    channelMembers.delete("user-b");
    userB.voice.channelId = null;

    await handleVoiceStateChange(
      { channelId: "vc-1", channel, member: userB, guild: { id: guildId } },
      { channelId: null, channel: null, member: userB, guild: { id: guildId } },
    );

    assert.equal(activeSessions.size, 0);
  } finally {
    ActiveVoiceSession.findOneAndUpdate = origUpdate;
    ActiveVoiceSession.deleteOne = origDelete;
    activeSessions.clear();
  }
});

test("VoiceLifecycle: preserva originalStart al cambiar de canal y liquida al silenciarse", async () => {
  activeSessions.clear();

  const origUpdate = ActiveVoiceSession.findOneAndUpdate;
  const origDelete = ActiveVoiceSession.deleteOne;
  ActiveVoiceSession.findOneAndUpdate = async () => ({});
  ActiveVoiceSession.deleteOne = async () => ({});

  try {
    const guildId = "guild-vc-2";
    const originalTime = Date.now() - 45 * 60_000;

    const makeChannel = (id, membersMap) => ({
      id,
      members: {
        filter: (fn) => ({
          size: [...membersMap.values()].filter(fn).length,
        }),
        [Symbol.iterator]: function* () {
          yield* membersMap.entries();
        },
      },
    });

    const ch2Members = new Map();
    const ch2 = makeChannel("vc-2", ch2Members);

    const userA = {
      id: "user-a",
      user: { bot: false, username: "user-a" },
      guild: { id: guildId, afkChannelId: null, name: "TestGuild" },
      roles: { cache: new Map() },
      voice: {
        channelId: "vc-2",
        channel: ch2,
        selfMute: false,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
      },
    };
    const userC = {
      id: "user-c",
      user: { bot: false, username: "user-c" },
      guild: { id: guildId, afkChannelId: null, name: "TestGuild" },
      roles: { cache: new Map() },
      voice: {
        channelId: "vc-2",
        channel: ch2,
        selfMute: false,
        selfDeaf: false,
        serverMute: false,
        serverDeaf: false,
      },
    };

    ch2Members.set("user-a", userA);
    ch2Members.set("user-c", userC);

    activeSessions.set(`user-a:${guildId}`, {
      start: originalTime,
      originalStart: originalTime,
      userId: "user-a",
      guildId,
      channelId: "vc-1",
      token: "tok-1",
    });

    // Cambia de vc-1 a vc-2 -> debe conservar originalStart
    await handleVoiceStateChange(
      { channelId: "vc-1", channel: null, member: userA, guild: { id: guildId } },
      { channelId: "vc-2", channel: ch2, member: userA, guild: { id: guildId } },
    );

    const movedSession = activeSessions.get(`user-a:${guildId}`);
    assert.ok(movedSession);
    assert.equal(movedSession.channelId, "vc-2");
    assert.equal(movedSession.originalStart, originalTime);

    // Usuario A se silencia -> debe cerrar su sesión activa
    userA.voice.selfMute = true;
    await handleVoiceStateChange(
      { channelId: "vc-2", channel: ch2, member: userA, guild: { id: guildId } },
      { channelId: "vc-2", channel: ch2, member: userA, guild: { id: guildId } },
    );
    assert.equal(activeSessions.has(`user-a:${guildId}`), false);
  } finally {
    ActiveVoiceSession.findOneAndUpdate = origUpdate;
    ActiveVoiceSession.deleteOne = origDelete;
    activeSessions.clear();
  }
});

test("VoiceManager: rehydrateVoiceSessions conserva timestamps start y originalStart", async () => {
  activeSessions.clear();
  const origFind = ActiveVoiceSession.find;
  const savedStart = new Date(Date.now() - 15 * 60_000);
  const savedOriginal = new Date(Date.now() - 90 * 60_000);

  ActiveVoiceSession.find = async () => [
    {
      _id: "doc-1",
      userId: "u-rehydrate",
      guildId: "g-rehydrate",
      channelId: "ch-1",
      start: savedStart,
      originalStart: savedOriginal,
      token: "tok-rehydrate",
    },
  ];

  const fakeVoiceState = {
    channelId: "ch-1",
    selfDeaf: false,
    selfMute: false,
    serverDeaf: false,
    serverMute: false,
    member: { user: { bot: false } },
    guild: { afkChannelId: null },
    channel: {
      members: {
        filter: () => ({ size: 2 }),
      },
    },
  };

  initVoiceSessionClient({
    guilds: {
      cache: new Map([
        [
          "g-rehydrate",
          {
            voiceStates: {
              cache: new Map([["u-rehydrate", fakeVoiceState]]),
            },
          },
        ],
      ]),
    },
  });

  try {
    await rehydrateVoiceSessions();
    const restored = activeSessions.get("u-rehydrate:g-rehydrate");
    assert.ok(restored);
    assert.equal(restored.start, savedStart.getTime());
    assert.equal(restored.originalStart, savedOriginal.getTime());
  } finally {
    ActiveVoiceSession.find = origFind;
    activeSessions.clear();
  }
});

test("TextXP: bloquea la concesion de XP dentro de la ventana de enfriamiento de 5 a 15s", async () => {
  const origGetLite = LevelConfigCache.getLite;
  const origFindOneAndUpdate = LocalLevel.findOneAndUpdate;
  const origUpdateOne = LocalLevel.updateOne;

  let xpAwardedCalls = 0;

  LevelConfigCache.getLite = async () => ({
    enabled: true,
    ignoreBots: true,
    ignoredChannels: [],
    ignoredRoles: [],
    xpMinLength: 5,
    xpPerMessage: 20,
    xpCooldown: 60,
    xpMultiplier: 1,
    xpMentionBonus: 0,
    xpMentionMaxBonus: 25,
    levelRoles: [],
    announceMode: "silent",
    announceDM: false,
    announceChannelId: null,
  });

  LocalLevel.findOneAndUpdate = async (_filter, update) => {
    if (update && update.$inc && update.$inc.xp) {
      xpAwardedCalls++;
    }
    return {
      userId: "u-text",
      guildId: "g-text",
      xp: 100,
      level: 1,
      messagesSent: 5,
      // Último mensaje con XP hace 10 segundos (entre 5s y 15s)
      lastXpGain: new Date(Date.now() - 10_000),
      abuseCooldownUntil: null,
    };
  };

  LocalLevel.updateOne = async () => ({});

  try {
    await handleLevelXp({
      guild: { id: "g-text" },
      author: { id: "u-text", bot: false },
      channelId: "ch-text",
      content: "Mensaje valido durante el cooldown de 10s",
      member: { roles: { cache: { map: () => [] } } },
      mentions: {
        users: {
          size: 0,
          filter: () => ({ size: 0 }),
        },
      },
    });

    assert.equal(xpAwardedCalls, 0);
  } finally {
    LevelConfigCache.getLite = origGetLite;
    LocalLevel.findOneAndUpdate = origFindOneAndUpdate;
    LocalLevel.updateOne = origUpdateOne;
  }
});
