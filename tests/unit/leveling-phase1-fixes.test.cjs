const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const {
  totalXpForLevel,
  totalXpForVoiceLevel,
  xpForLevel,
  xpForVoiceLevel,
  getCurrentWeekStart,
} = require(path.join(buildDir, "Features/leveling/xpRules.js"));

const { LevelConfigCache } = require(path.join(buildDir, "Database/leveling/LevelConfigCache.js"));
const LevelConfig = require(path.join(buildDir, "Database/leveling/levelConfig.model.js")).default;
const LocalLevel = require(path.join(buildDir, "Database/leveling/localLevel.model.js")).default;
const { assignLevelRoles } = require(path.join(buildDir, "Features/leveling/levelRoleManager.js"));
const { handleVoiceXp } = require(path.join(buildDir, "Features/leveling/voiceXp.js"));

test("Phase 1 - XpRules: Fórmulas cerradas O(1) equivalentes a suma acumulada", () => {
  // Verificar texto
  for (let lvl = 0; lvl <= 50; lvl++) {
    let expected = 0;
    for (let i = 0; i < lvl; i++) expected += xpForLevel(i);
    assert.equal(totalXpForLevel(lvl), expected, `Fórmula de texto falló en nivel ${lvl}`);
  }

  // Verificar voz
  for (let lvl = 0; lvl <= 50; lvl++) {
    let expected = 0;
    for (let i = 0; i < lvl; i++) expected += xpForVoiceLevel(i);
    assert.equal(totalXpForVoiceLevel(lvl), expected, `Fórmula de voz falló en nivel ${lvl}`);
  }
});

test("Phase 1 - LevelConfigCache: Cachea centinela para guilds sin configuración evitando query storms", async () => {
  LevelConfigCache.clear();

  let mongoQueries = 0;
  const origFindOne = LevelConfig.findOne;
  LevelConfig.findOne = () => {
    mongoQueries++;
    return {
      lean: async () => null,
    };
  };

  try {
    const guildId = "guild-unconfigured-123";

    // Primera llamada -> consulta Mongo y guarda centinela
    const res1 = await LevelConfigCache.getLite(guildId);
    assert.equal(res1, null);
    assert.equal(mongoQueries, 1);

    // Siguientes llamadas -> responden desde LRU sin consultar Mongo
    const res2 = await LevelConfigCache.getLite(guildId);
    assert.equal(res2, null);
    assert.equal(mongoQueries, 1);

    const res3 = await LevelConfigCache.getLite(guildId);
    assert.equal(res3, null);
    assert.equal(mongoQueries, 1, "Debe responder desde caché y no repetir consulta a Mongo");

    // Invalidar y volver a consultar
    LevelConfigCache.invalidate(guildId);
    const res4 = await LevelConfigCache.getLite(guildId);
    assert.equal(res4, null);
    assert.equal(mongoQueries, 2, "Al invalidar debe consultar nuevamente");
  } finally {
    LevelConfig.findOne = origFindOne;
    LevelConfigCache.clear();
  }
});

test("Phase 1 - LevelRoleManager: Otorga roles al cruzar umbrales y formatea mensajes", async () => {
  const rolesAdded = [];
  const messagesSent = [];

  const mockMember = {
    displayName: "HannaDev",
    roles: {
      cache: new Map(),
      add: async (roleId) => {
        rolesAdded.push(roleId);
      },
    },
    guild: {
      systemChannel: {
        send: async (msg) => {
          messagesSent.push(msg);
          return { id: "msg-123" };
        },
      },
    },
  };

  const mockGuild = {
    roles: {
      cache: new Map([
        ["role-lvl-5", { id: "role-lvl-5", name: "Aprendiz" }],
        ["role-lvl-10", { id: "role-lvl-10", name: "Experto" }],
      ]),
    },
  };

  const levelRoles = [
    { level: 5, roleId: "role-lvl-5", message: "¡{user} alcanzó el nivel {level} y recibió el rol {role}!" },
    { level: 10, roleId: "role-lvl-10", message: "¡{user} ahora es {role} (Nv. {level})!" },
    { level: 20, roleId: "role-lvl-20" },
  ];

  // Subida de nivel 3 a 10 (debe dar role-lvl-5 y role-lvl-10)
  await assignLevelRoles(mockMember, levelRoles, 3, 10, mockGuild);

  assert.deepEqual(rolesAdded, ["role-lvl-5", "role-lvl-10"]);
  assert.equal(messagesSent.length, 2);
  assert.ok(messagesSent[0].includes("HannaDev"));
  assert.ok(messagesSent[0].includes("Aprendiz"));
  assert.ok(messagesSent[1].includes("Experto"));
});

test("Phase 1 - VoiceXp: Otorga roles de nivel en subidas de nivel por voz", async () => {
  const rolesGiven = [];

  const mockMember = {
    id: "user-voice-lvl",
    displayName: "VoiceQueen",
    roles: {
      cache: new Map(),
      add: async (roleId) => {
        rolesGiven.push(roleId);
      },
    },
    guild: {
      id: "guild-vc-role",
      name: "GuildVC",
      roles: {
        cache: new Map([
          ["role-vc-5", { id: "role-vc-5", name: "Vocal Star" }],
        ]),
      },
      channels: { cache: new Map() },
    },
  };

  const origUpdateOne = LocalLevel.updateOne;
  const origFindOne = LocalLevel.findOne;

  LocalLevel.updateOne = async () => ({ modifiedCount: 1 });
  // Simular que el usuario acumuló suficiente XP de voz para subir al Nivel 5
  LocalLevel.findOne = async () => ({
    voiceLevel: 0,
    voiceXp: totalXpForVoiceLevel(5) + 50,
  });

  try {
    const config = {
      xpVoiceEnabled: true,
      ignoredChannels: [],
      ignoredRoles: [],
      xpVoiceMinMinutes: 1,
      xpPerMinuteVoice: 10,
      xpMultiplier: 1.0,
      levelRoles: [
        { level: 5, roleId: "role-vc-5", message: "¡Felicitaciones {user} por el rol {role}!" },
      ],
    };

    const res = await handleVoiceXp(mockMember, config, 10, "vc-channel-1", 10, "cred-voice-role");

    assert.equal(res.applied, true);
    assert.equal(res.leveledUp, true);
    assert.equal(res.newVoiceLevel, 5);
    assert.deepEqual(rolesGiven, ["role-vc-5"], "Debe asignar el rol configurado al subir de nivel en voz");
  } finally {
    LocalLevel.updateOne = origUpdateOne;
    LocalLevel.findOne = origFindOne;
  }
});
