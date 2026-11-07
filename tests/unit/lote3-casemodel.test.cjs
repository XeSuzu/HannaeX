const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const caseModel = require(path.join(distDir, "Database/moderation/case.model.js"));
const caseCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/case.js")).default;
const casesCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/cases.js")).default;
const { PermissionFlagsBits } = require("discord.js");

test("LOTE 3: CaseAction enum y caseSchema aceptan 'unmute' y demás acciones", () => {
  const schemaActions = caseModel.CaseModel.schema.path("action").enumValues;
  assert.ok(schemaActions.includes("unmute"), "caseSchema debe incluir 'unmute' en su enum");
  assert.ok(schemaActions.includes("warn"), "caseSchema debe incluir 'warn'");
  assert.ok(schemaActions.includes("timeout"), "caseSchema debe incluir 'timeout'");
  assert.ok(schemaActions.includes("kick"), "caseSchema debe incluir 'kick'");
  assert.ok(schemaActions.includes("ban"), "caseSchema debe incluir 'ban'");
  assert.ok(schemaActions.includes("unban"), "caseSchema debe incluir 'unban'");
  assert.ok(schemaActions.includes("purge"), "caseSchema debe incluir 'purge'");
});

test("LOTE 3: createCase numera secuencialmente caseId (1, 2, 3...)", async () => {
  const casesDB = [];
  const sequences = new Map();

  const originalFindOne = caseModel.CaseModel.findOne;
  const originalCreate = caseModel.CaseModel.create;
  const originalSeqFindOneAndUpdate = caseModel.GuildSequenceModel?.findOneAndUpdate;

  if (caseModel.GuildSequenceModel) {
    caseModel.GuildSequenceModel.findOneAndUpdate = async function (filter, update) {
      const key = `${filter.guildId}:${filter.name}`;
      let current = sequences.get(key) || 0;
      if (update.$setOnInsert && !sequences.has(key)) {
        current = update.$setOnInsert.seq || 0;
        sequences.set(key, current);
        return { seq: current };
      }
      if (update.$inc && update.$inc.seq) {
        current += update.$inc.seq;
        sequences.set(key, current);
        return { seq: current };
      }
      return { seq: current };
    };
  }

  caseModel.CaseModel.findOne = function (filter) {
    return {
      sort: () => ({
        select: () => ({
          lean: async () => {
            const guildCases = casesDB.filter((c) => c.guildId === filter.guildId);
            if (guildCases.length === 0) return null;
            return guildCases.reduce((max, c) => (c.caseId > max.caseId ? c : max), guildCases[0]);
          },
        }),
      }),
    };
  };

  caseModel.CaseModel.create = async function (data) {
    const doc = { ...data, _id: `case-${data.caseId}`, createdAt: new Date() };
    casesDB.push(doc);
    return doc;
  };

  try {
    const case1 = await caseModel.createCase({
      guildId: "guild-seq-test",
      userId: "user-1",
      modId: "mod-1",
      action: "warn",
      reason: "Primera falta",
      source: "manual",
    });

    const case2 = await caseModel.createCase({
      guildId: "guild-seq-test",
      userId: "user-2",
      modId: "mod-1",
      action: "timeout",
      reason: "Segunda falta",
      source: "manual",
      durationMs: 60000,
    });

    const case3 = await caseModel.createCase({
      guildId: "guild-seq-test",
      userId: "user-3",
      modId: "mod-1",
      action: "unmute",
      reason: "Perdonado",
      source: "manual",
    });

    assert.equal(case1.caseId, 1, "El primer caso debe ser caseId = 1");
    assert.equal(case2.caseId, 2, "El segundo caso debe ser caseId = 2");
    assert.equal(case3.caseId, 3, "El tercer caso debe ser caseId = 3");
  } finally {
    caseModel.CaseModel.findOne = originalFindOne;
    caseModel.CaseModel.create = originalCreate;
    if (caseModel.GuildSequenceModel && originalSeqFindOneAndUpdate) {
      caseModel.GuildSequenceModel.findOneAndUpdate = originalSeqFindOneAndUpdate;
    }
  }
});

test("LOTE 3: getCaseById y getRecentCases consultan correctamente", async () => {
  const originalFindOne = caseModel.CaseModel.findOne;
  const originalFind = caseModel.CaseModel.find;

  caseModel.CaseModel.findOne = function (filter) {
    return {
      lean: async () => {
        if (filter.guildId === "guild-query-test" && filter.caseId === 42) {
          return {
            caseId: 42,
            guildId: "guild-query-test",
            userId: "user-42",
            modId: "mod-42",
            action: "ban",
            reason: "Query test ban",
            source: "manual",
            createdAt: new Date(),
          };
        }
        return null;
      },
    };
  };

  caseModel.CaseModel.find = function (filter) {
    return {
      sort: () => ({
        limit: (n) => ({
          lean: async () => [
            {
              caseId: 2,
              guildId: filter.guildId,
              userId: filter.userId || "user-recent-2",
              modId: "mod-1",
              action: "kick",
              reason: "Razón 2",
              source: "manual",
              createdAt: new Date(),
            },
            {
              caseId: 1,
              guildId: filter.guildId,
              userId: filter.userId || "user-recent-1",
              modId: "mod-1",
              action: "warn",
              reason: "Razón 1",
              source: "manual",
              createdAt: new Date(Date.now() - 10000),
            },
          ].slice(0, n),
        }),
      }),
    };
  };

  try {
    const foundCase = await caseModel.getCaseById("guild-query-test", 42);
    assert.ok(foundCase, "Debe encontrar el caso #42");
    assert.equal(foundCase.caseId, 42);
    assert.equal(foundCase.action, "ban");

    const notFound = await caseModel.getCaseById("guild-query-test", 999);
    assert.equal(notFound, null, "Caso inexistente debe ser null");

    const recent = await caseModel.getRecentCases("guild-query-test", 10);
    assert.equal(recent.length, 2, "Debe retornar 2 casos recientes");
    assert.equal(recent[0].caseId, 2);
  } finally {
    caseModel.CaseModel.findOne = originalFindOne;
    caseModel.CaseModel.find = originalFind;
  }
});

test("LOTE 3: /case valida permisos de moderador y renderiza caso existente", async () => {
  let editReplyPayload = null;

  const mockInteractionWithoutPerms = {
    inGuild: () => true,
    guild: { id: "guild-case-cmd", ownerId: "owner-1" },
    member: {
      id: "mod-no-perms",
      roles: { highest: { position: 10 } },
    },
    memberPermissions: {
      has: () => false,
    },
    user: { id: "mod-no-perms", tag: "ModNoPerms#0001" },
    options: {
      getInteger: () => 1,
    },
    editReply: async (data) => {
      editReplyPayload = data;
    },
  };

  // 1. Sin permisos
  await caseCmd.execute(mockInteractionWithoutPerms, {});
  assert.ok(editReplyPayload, "Debe responder ante falta de permisos");
  assert.match(editReplyPayload.content, /No tienes los permisos/i);

  // 2. Con permisos y caso existente
  const originalGetCaseById = caseModel.getCaseById;
  caseModel.getCaseById = async (guildId, caseId) => {
    if (caseId === 7) {
      return {
        caseId: 7,
        guildId,
        userId: "target-7",
        modId: "mod-ok",
        action: "timeout",
        reason: "Flood de mensajes",
        source: "manual",
        durationMs: 300000,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
    }
    return null;
  };

  const mockInteractionWithPerms = {
    inGuild: () => true,
    guild: { id: "guild-case-cmd", ownerId: "owner-1" },
    member: {
      id: "mod-ok",
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.ModerateMembers,
    },
    user: { id: "mod-ok", tag: "ModOk#0001" },
    options: {
      getInteger: () => 7,
    },
    editReply: async (data) => {
      editReplyPayload = data;
    },
  };

  try {
    await caseCmd.execute(mockInteractionWithPerms, {});
    assert.ok(editReplyPayload.embeds, "Debe responder con un embed");
    const embed = editReplyPayload.embeds[0];
    assert.match(embed.data.title, /Caso #7/);
    assert.match(embed.data.title, /Silencio/i);

    const fields = embed.data.fields;
    const targetField = fields.find((f) => f.name.includes("Usuario"));
    const reasonField = fields.find((f) => f.name.includes("Razón"));
    const durationField = fields.find((f) => f.name.includes("Duración"));

    assert.ok(targetField.value.includes("target-7"));
    assert.equal(reasonField.value, "Flood de mensajes");
    assert.ok(durationField.value.includes("5 minutes") || durationField.value.includes("5m"));
  } finally {
    caseModel.getCaseById = originalGetCaseById;
  }
});

test("LOTE 3: /cases lista casos por usuario o recientes del servidor", async () => {
  let editReplyPayload = null;

  const originalGetRecentCases = caseModel.getRecentCases;
  const originalGetCasesByUser = caseModel.getCasesByUser;

  caseModel.getRecentCases = async (guildId, limit) => [
    {
      caseId: 10,
      guildId,
      userId: "user-10",
      modId: "mod-1",
      action: "ban",
      reason: "Raid",
      source: "manual",
      createdAt: new Date(),
    },
  ];

  caseModel.getCasesByUser = async (guildId, userId, limit) => [
    {
      caseId: 5,
      guildId,
      userId,
      modId: "mod-2",
      action: "warn",
      reason: "Spam",
      source: "manual",
      createdAt: new Date(),
    },
  ];

  const mockInteraction = {
    inGuild: () => true,
    guild: { id: "guild-cases-cmd", name: "Guild Test", ownerId: "owner-1" },
    member: {
      id: "mod-ok",
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.ModerateMembers,
    },
    user: { id: "mod-ok", tag: "ModOk#0001" },
    options: {
      getUser: (name) => null,
      getInteger: (name) => 10,
    },
    editReply: async (data) => {
      editReplyPayload = data;
    },
  };

  try {
    // 1. Sin especificar usuario (casos recientes del servidor)
    await casesCmd.execute(mockInteraction, {});
    assert.ok(editReplyPayload.embeds);
    assert.match(editReplyPayload.embeds[0].data.title, /Historial de Casos Recientes/);
    assert.match(editReplyPayload.embeds[0].data.description, /#10/);
    assert.match(editReplyPayload.embeds[0].data.description, /BAN/);

    // 2. Especificando usuario
    mockInteraction.options.getUser = (name) => ({
      id: "user-5",
      tag: "Target5#0001",
      displayAvatarURL: () => "https://example.com/avatar.png",
    });

    await casesCmd.execute(mockInteraction, {});
    assert.ok(editReplyPayload.embeds);
    assert.match(editReplyPayload.embeds[0].data.title, /Target5#0001/);
    assert.match(editReplyPayload.embeds[0].data.description, /#5/);
    assert.match(editReplyPayload.embeds[0].data.description, /WARN/);
  } finally {
    caseModel.getRecentCases = originalGetRecentCases;
    caseModel.getCasesByUser = originalGetCasesByUser;
  }
});
