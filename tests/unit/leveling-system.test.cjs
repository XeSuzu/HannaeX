const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

const {
  activeSessions,
  partialSeconds,
  closeSession,
  initVoiceSessionClient,
  rehydrateVoiceSessions,
  processActiveVoiceInterval,
} = require(path.join(buildDir, "Events/Client/handlers/voice/voiceManager.js"));
const {
  handleVoiceStateChange,
  mapConcurrent,
  SYNC_CONCURRENCY_BATCH_SIZE,
} = require(path.join(buildDir, "Events/Client/handlers/voice/voiceLifecycle.js"));
const {
  isEligibleCompanion,
  isValidSession,
} = require(path.join(buildDir, "Events/Client/handlers/voice/voiceUtils.js"));
const {
  handleVoiceXp,
  deriveContinuousCreditId,
  deriveDiscontinuousCreditId,
  ensureLocalLevelExists,
  getActivityMultiplier,
} = require(path.join(buildDir, "Features/leveling/voiceXp.js"));
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

test("VoiceXP V01 & V03: Continuidad de segundos en intervalos de 5m y liquidación discontinua (40s + 20s = 60s) con creditId determinista", async () => {
  activeSessions.clear();
  partialSeconds.clear();

  const origUpdate = ActiveVoiceSession.findOneAndUpdate;
  const origDelete = ActiveVoiceSession.deleteOne;
  const origGetLite = LevelConfigCache.getLite;
  const origLocalUpdateOne = LocalLevel.updateOne;
  const origLocalFindOne = LocalLevel.findOne;

  ActiveVoiceSession.findOneAndUpdate = async () => ({});
  ActiveVoiceSession.deleteOne = async () => ({});
  LevelConfigCache.getLite = async () => ({
    enabled: true,
    xpVoiceEnabled: true,
    ignoredChannels: [],
    ignoredRoles: [],
    xpVoiceMinMinutes: 1,
    xpPerMinuteVoice: 10,
    xpMultiplier: 1,
  });

  const appliedCredits = [];
  let totalCreditedMinutes = 0;

  LocalLevel.updateOne = async (filter, update, options) => {
    if (options && options.upsert === true) return { acknowledged: true };
    if (Array.isArray(update)) {
      const creditFilter = filter["appliedCreditIds.id"];
      const cid = creditFilter && creditFilter.$ne;
      if (cid && appliedCredits.includes(cid)) {
        return { modifiedCount: 0 };
      }
      if (cid) appliedCredits.push(cid);
      const minsAdd = update[0].$set.voiceMinutes.$add[1];
      totalCreditedMinutes += minsAdd;
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 1 };
  };
  LocalLevel.findOne = async () => ({ voiceXp: totalCreditedMinutes * 10, voiceLevel: 0 });

  const mockMember = {
    id: "u-disc",
    user: { bot: false, username: "DiscUser" },
    guild: { id: "g-disc", afkChannelId: null, name: "DiscGuild" },
    roles: { cache: new Map() },
    voice: {
      channelId: "vc-1",
      selfMute: false,
      selfDeaf: false,
      serverMute: false,
      serverDeaf: false,
      channel: {
        id: "vc-1",
        members: { filter: () => ({ size: 2 }) },
      },
    },
  };

  initVoiceSessionClient({
    guilds: {
      cache: new Map([
        [
          "g-disc",
          {
            members: { cache: new Map([["u-disc", mockMember]]) },
          },
        ],
      ]),
    },
  });

  try {
    // 1. Tramo 1: 40 segundos (sub-minuto, Escenario 01/22)
    const t0 = 1_700_000_000_000;
    activeSessions.set("u-disc:g-disc", {
      start: t0,
      originalStart: t0,
      userId: "u-disc",
      guildId: "g-disc",
      channelId: "vc-1",
      token: "tok-a",
    });

    await closeSession("u-disc", "g-disc", t0 + 40_000);
    assert.equal(totalCreditedMinutes, 0, "40s no alcanza 1 minuto completo aún");
    assert.equal(partialSeconds.get("u-disc:g-disc")?.seconds, 40, "Debe retener 40s residuales");

    // 2. Tramo 2: 20 segundos -> 40s + 20s = 60s = 1 minuto exacto (Escenario 22)
    const t1 = t0 + 100_000;
    activeSessions.set("u-disc:g-disc", {
      start: t1,
      originalStart: t0,
      userId: "u-disc",
      guildId: "g-disc",
      channelId: "vc-1",
      token: "tok-b",
    });

    await closeSession("u-disc", "g-disc", t1 + 20_000);
    assert.equal(totalCreditedMinutes, 1, "40s + 20s debe consolidar exactamente 1 minuto");
    assert.equal(partialSeconds.has("u-disc:g-disc"), false, "El remanente debe quedar en 0s");
    assert.equal(appliedCredits[0], deriveDiscontinuousCreditId("tok-b", t1, 1));

    // 3. Intervalo continuo de 5m 45s: avanza start exactamente +5m preservando los 45s (Escenario 05)
    const t2 = 1_700_001_000_000;
    activeSessions.set("u-disc:g-disc", {
      start: t2,
      originalStart: t2,
      userId: "u-disc",
      guildId: "g-disc",
      channelId: "vc-1",
      token: "tok-cont",
    });

    await processActiveVoiceInterval(t2 + 5 * 60_000 + 45_000);
    assert.equal(totalCreditedMinutes, 6, "Debe acreditar 5 minutos del intervalo");
    const updatedSession = activeSessions.get("u-disc:g-disc");
    assert.equal(
      updatedSession.start,
      t2 + 5 * 60_000,
      "session.start debe avanzar exactamente 5m (preservando los 45s residuales)",
    );
    assert.equal(appliedCredits[1], deriveContinuousCreditId("tok-cont", t2));
  } finally {
    ActiveVoiceSession.findOneAndUpdate = origUpdate;
    ActiveVoiceSession.deleteOne = origDelete;
    LevelConfigCache.getLite = origGetLite;
    LocalLevel.updateOne = origLocalUpdateOne;
    LocalLevel.findOne = origLocalFindOne;
    activeSessions.clear();
    partialSeconds.clear();
  }
});

test("VoiceXP V03 & V08: Idempotencia ante Lost ACK, conflicto E11000 en ensureLocalLevelExists y rollback de partialSeconds/intervalo", async () => {
  activeSessions.clear();
  partialSeconds.clear();

  const origLocalUpdateOne = LocalLevel.updateOne;
  const origLocalFindOne = LocalLevel.findOne;
  const origGetLite = LevelConfigCache.getLite;
  const origDelete = ActiveVoiceSession.deleteOne;

  try {
    // 1. Escenarios 27 y 28: Conflicto E11000 esperado en { userId: 1, guildId: 1 } es suprimido; otro error se propaga
    let callCount = 0;
    LocalLevel.updateOne = async () => {
      callCount++;
      if (callCount === 2) {
        const dupErr = new Error("E11000 duplicate key error collection: locallevels index: userId_1_guildId_1");
        dupErr.code = 11000;
        dupErr.keyPattern = { userId: 1, guildId: 1 };
        throw dupErr;
      }
      return { acknowledged: true };
    };

    await Promise.all([
      ensureLocalLevelExists("u-race", "g-race"),
      ensureLocalLevelExists("u-race", "g-race"),
    ]);
    assert.equal(callCount, 2, "Ambas llamadas concurrentes a ensureLocalLevelExists deben resolver sin arrojar E11000");

    LocalLevel.updateOne = async () => {
      const netErr = new Error("MongoNetworkTimeoutError");
      netErr.code = 89;
      throw netErr;
    };
    await assert.rejects(
      () => ensureLocalLevelExists("u-race", "g-race"),
      /MongoNetworkTimeoutError/,
      "Errores reales de red o de otros índices deben propagarse",
    );

    // 2. Escenario 25: Lost ACK / reintento con el mismo creditId no duplica XP
    const seenIds = new Set();
    let voiceMinutesDB = 10;

    LocalLevel.updateOne = async (filter, update, options) => {
      if (options && options.upsert === true) return { acknowledged: true };
      if (Array.isArray(update)) {
        const cid = filter["appliedCreditIds.id"]?.$ne;
        if (cid && seenIds.has(cid)) {
          return { modifiedCount: 0 };
        }
        if (cid) seenIds.add(cid);
        voiceMinutesDB += update[0].$set.voiceMinutes.$add[1];
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 1 };
    };
    LocalLevel.findOne = async () => ({ voiceXp: voiceMinutesDB * 10, voiceLevel: 0 });

    const dummyMember = {
      id: "u-ack",
      user: { username: "AckUser" },
      guild: { id: "g-ack", name: "AckGuild" },
      roles: { cache: new Map() },
    };
    const cfg = {
      xpVoiceEnabled: true,
      ignoredChannels: [],
      ignoredRoles: [],
      xpVoiceMinMinutes: 1,
      xpPerMinuteVoice: 10,
      xpMultiplier: 1,
    };

    const firstTry = await handleVoiceXp(dummyMember, cfg, 5, "vc-1", 5, "cont:tok-1:1000");
    const retryAfterLostAck = await handleVoiceXp(dummyMember, cfg, 5, "vc-1", 5, "cont:tok-1:1000");

    assert.equal(firstTry.applied, true);
    assert.equal(retryAfterLostAck.applied, false, "El reintento con el mismo creditId debe ser idempotente");
    assert.equal(voiceMinutesDB, 15, "Solo debe haberse acreditado 1 vez (+5 min)");

    // 3. Escenario 23: Fallo de MongoDB al cerrar sesión preserva partialSeconds en memoria
    ActiveVoiceSession.deleteOne = async () => ({});
    LevelConfigCache.getLite = async () => ({ enabled: true, ...cfg });
    initVoiceSessionClient({
      guilds: {
        cache: new Map([
          ["g-ack", { members: { cache: new Map([["u-ack", dummyMember]]) } }],
        ]),
      },
    });

    LocalLevel.updateOne = async (_f, _u, options) => {
      if (options && options.upsert === true) return { acknowledged: true };
      throw new Error("MongoNetworkTimeoutError");
    };

    const startFail = 2_000_000_000;
    partialSeconds.set("u-ack:g-ack", { seconds: 40, seq: 0 });
    activeSessions.set("u-ack:g-ack", {
      start: startFail,
      originalStart: startFail,
      userId: "u-ack",
      guildId: "g-ack",
      channelId: "vc-1",
      token: "tok-fail",
    });

    await closeSession("u-ack", "g-ack", startFail + 25_000);
    assert.equal(
      partialSeconds.get("u-ack:g-ack")?.seconds,
      65,
      "Si MongoDB falla en closeSession, los 65s acumulados deben restaurarse en partialSeconds",
    );
  } finally {
    LocalLevel.updateOne = origLocalUpdateOne;
    LocalLevel.findOne = origLocalFindOne;
    LevelConfigCache.getLite = origGetLite;
    ActiveVoiceSession.deleteOne = origDelete;
    activeSessions.clear();
    partialSeconds.clear();
  }
});

test("VoiceXP V05 & V06: Rehidratación corta (<=60s) vs caída larga (>2m) con reseteo de curva y exclusión de ensordecidos en quórum", async () => {
  activeSessions.clear();
  const origFind = ActiveVoiceSession.find;
  const origUpdate = ActiveVoiceSession.findOneAndUpdate;

  // 1. V06 (Escenario 20): Acompañante ensordecido NO cuenta para el quórum; acompañante silenciado SÍ cuenta
  assert.equal(
    isEligibleCompanion({ user: { bot: false }, voice: { selfDeaf: true, selfMute: false } }),
    false,
    "Un miembro ensordecido no debe contar como acompañante válido",
  );
  assert.equal(
    isEligibleCompanion({ user: { bot: false }, voice: { selfDeaf: false, selfMute: true } }),
    true,
    "Un miembro silenciado pero oyente activo sí cuenta como acompañante",
  );
  assert.equal(getActivityMultiplier(400), 0.25);
  assert.equal(getActivityMultiplier(0), 1.0);

  // 2. V05 (Escenario 30): Rehidratación tras caída corta (40s) vs caída prolongada (3h)
  const now = 1_700_010_000_000;
  const oldStart = new Date(now - 3 * 3600_000);
  const oldOriginalStart = new Date(now - 6 * 3600_000); // 6h antes (multiplicador degradado a 0.25)

  ActiveVoiceSession.findOneAndUpdate = async () => ({});
  ActiveVoiceSession.find = async () => [
    {
      _id: "doc-short",
      userId: "u-short",
      guildId: "g-v05",
      channelId: "ch-1",
      start: oldStart,
      originalStart: oldOriginalStart,
      token: "tok-short",
      lastShutdownAt: new Date(now - 40_000), // Apagado hace 40s (<= 60s)
    },
    {
      _id: "doc-long",
      userId: "u-long",
      guildId: "g-v05",
      channelId: "ch-1",
      start: oldStart,
      originalStart: oldOriginalStart,
      token: "tok-long",
      lastShutdownAt: new Date(now - 3 * 3600_000), // Caída de 3 horas (> 60s)
    },
  ];

  const validVoiceState = {
    channelId: "ch-1",
    selfDeaf: false,
    selfMute: false,
    serverDeaf: false,
    serverMute: false,
    member: { user: { bot: false } },
    guild: { afkChannelId: null },
    channel: {
      members: { filter: () => ({ size: 2 }) },
    },
  };

  initVoiceSessionClient({
    guilds: {
      cache: new Map([
        [
          "g-v05",
          {
            voiceStates: {
              cache: new Map([
                ["u-short", validVoiceState],
                ["u-long", validVoiceState],
              ]),
            },
          },
        ],
      ]),
    },
  });

  try {
    await rehydrateVoiceSessions({ now });

    const shortSession = activeSessions.get("u-short:g-v05");
    assert.equal(shortSession.start, oldStart.getTime(), "Deploy corto (<60s) preserva start");
    assert.equal(shortSession.originalStart, oldOriginalStart.getTime(), "Deploy corto preserva originalStart");

    const longSession = activeSessions.get("u-long:g-v05");
    assert.equal(longSession.start, now, "Caída larga (>60s) aplica cero downtime (start = now)");
    assert.equal(
      longSession.originalStart,
      now,
      "Caída larga reinicia originalStart = now para devolver la curva al 100%",
    );
    assert.equal(SYNC_CONCURRENCY_BATCH_SIZE, 3, "V08: concurrencia de sync acotada a lotes de 3");
  } finally {
    ActiveVoiceSession.find = origFind;
    ActiveVoiceSession.findOneAndUpdate = origUpdate;
    activeSessions.clear();
  }
});
