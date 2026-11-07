const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const caseModel = require(path.join(
  distDir,
  "Database/moderation/case.model.js",
));
const casesCmd = require(path.join(
  distDir,
  "Commands/SlashCmds/Moderation/cases.js",
)).default;
const { HoshikoLogger, LogLevel } = require(path.join(
  distDir,
  "Security/Logger/HoshikoLogger.js",
));
const { PermissionFlagsBits } = require("discord.js");

test("AUD-01: 10 llamadas concurrentes simultáneas a createCase obtienen números únicos secuenciales sin colisiones", async () => {
  const guildId = "guild-concurrency-test";
  let seqCounter = 0;
  const createdCases = [];

  const origSeqFindOneAndUpdate = caseModel.GuildSequenceModel.findOneAndUpdate;
  const origCaseCreate = caseModel.CaseModel.create;
  const origCaseFindOne = caseModel.CaseModel.findOne;

  caseModel.GuildSequenceModel.findOneAndUpdate = async (filter, update) => {
    if (update.$inc && update.$inc.seq) {
      seqCounter += update.$inc.seq;
      return { seq: seqCounter };
    }
    return { seq: seqCounter };
  };

  caseModel.CaseModel.create = async (data) => {
    if (
      createdCases.some(
        (c) => c.caseId === data.caseId && c.guildId === data.guildId,
      )
    ) {
      const err = new Error("E11000 duplicate key error");
      err.code = 11000;
      throw err;
    }
    const doc = { ...data, _id: `case-${data.caseId}`, createdAt: new Date() };
    createdCases.push(doc);
    return doc;
  };

  caseModel.CaseModel.findOne = () => ({
    sort: () => ({ select: () => ({ lean: async () => null }) }),
  });

  try {
    const promises = Array.from({ length: 10 }, (_, i) =>
      caseModel.createCase({
        guildId,
        userId: `user-${i + 1}`,
        modId: "mod-auto",
        action: "warn",
        reason: `Infracción concurrente ${i + 1}`,
        source: "automod",
      }),
    );

    const results = await Promise.all(promises);

    assert.equal(results.length, 10, "Deben resolverse los 10 casos");
    const caseIds = results.map((r) => r.caseId);
    const uniqueIds = new Set(caseIds);
    assert.equal(uniqueIds.size, 10, "Los 10 caseId deben ser estrictamente únicos");

    const sortedIds = [...caseIds].sort((a, b) => a - b);
    assert.deepEqual(sortedIds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  } finally {
    caseModel.GuildSequenceModel.findOneAndUpdate = origSeqFindOneAndUpdate;
    caseModel.CaseModel.create = origCaseCreate;
    caseModel.CaseModel.findOne = origCaseFindOne;
  }
});

test("AUD-01: Inicialización de secuencia respeta el último caseId existente", async () => {
  const guildId = "guild-existing-cases";
  let initializedSeq = null;
  let currentSeq = null;

  const origSeqFindOneAndUpdate = caseModel.GuildSequenceModel.findOneAndUpdate;
  const origCaseCreate = caseModel.CaseModel.create;
  const origCaseFindOne = caseModel.CaseModel.findOne;

  caseModel.GuildSequenceModel.findOneAndUpdate = async (filter, update) => {
    if (currentSeq === null) {
      if (update.$setOnInsert) {
        initializedSeq = update.$setOnInsert.seq;
        currentSeq = initializedSeq;
        return { seq: currentSeq };
      }
      return null;
    }
    if (update.$inc) {
      currentSeq += update.$inc.seq;
      return { seq: currentSeq };
    }
    return { seq: currentSeq };
  };

  caseModel.CaseModel.findOne = () => ({
    sort: () => ({
      select: () => ({
        lean: async () => ({ caseId: 45 }),
      }),
    }),
  });

  caseModel.CaseModel.create = async (data) => ({
    ...data,
    _id: `case-${data.caseId}`,
  });

  try {
    const newCase = await caseModel.createCase({
      guildId,
      userId: "user-46",
      modId: "mod-1",
      action: "timeout",
      reason: "Continuidad",
    });

    assert.equal(
      initializedSeq,
      45,
      "La secuencia debe inicializarse con el lastCase.caseId (45)",
    );
    assert.equal(newCase.caseId, 46, "El nuevo caso debe ser caseId = 46");
  } finally {
    caseModel.GuildSequenceModel.findOneAndUpdate = origSeqFindOneAndUpdate;
    caseModel.CaseModel.create = origCaseCreate;
    caseModel.CaseModel.findOne = origCaseFindOne;
  }
});

test("AUD-01: createCase reintenta ante colisión accidental E11000", async () => {
  const guildId = "guild-collision-test";
  let attempts = 0;
  let seq = 10;

  const origSeqFindOneAndUpdate = caseModel.GuildSequenceModel.findOneAndUpdate;
  const origSeqUpdateOne = caseModel.GuildSequenceModel.updateOne;
  const origCaseCreate = caseModel.CaseModel.create;
  const origCaseFindOne = caseModel.CaseModel.findOne;

  caseModel.GuildSequenceModel.findOneAndUpdate = async () => {
    seq++;
    return { seq };
  };

  caseModel.GuildSequenceModel.updateOne = async (filter, update) => {
    if (update.$set && update.$set.seq) {
      seq = update.$set.seq;
    }
    return { acknowledged: true };
  };

  caseModel.CaseModel.findOne = () => ({
    sort: () => ({
      select: () => ({
        lean: async () => ({ caseId: 15 }),
      }),
    }),
  });

  caseModel.CaseModel.create = async (data) => {
    attempts++;
    if (attempts === 1) {
      const err = new Error("E11000 duplicate key error collection");
      err.code = 11000;
      throw err;
    }
    return { ...data, _id: "case-created" };
  };

  try {
    const res = await caseModel.createCase({
      guildId,
      userId: "user-retry",
      modId: "mod-1",
      action: "kick",
      reason: "Test de colisión",
    });

    assert.equal(attempts, 2, "Debe haber reintentado tras colisión E11000");
    assert.ok(res, "Debe haber retornado el caso creado exitosamente");
  } finally {
    caseModel.GuildSequenceModel.findOneAndUpdate = origSeqFindOneAndUpdate;
    caseModel.GuildSequenceModel.updateOne = origSeqUpdateOne;
    caseModel.CaseModel.create = origCaseCreate;
    caseModel.CaseModel.findOne = origCaseFindOne;
  }
});

test("AUD-05: createCase emite log estructurado con HoshikoLogger y no silencia el error tras agotar reintentos", async () => {
  const guildId = "guild-fail-test";
  const origSeqFindOneAndUpdate = caseModel.GuildSequenceModel.findOneAndUpdate;
  const origCaseCreate = caseModel.CaseModel.create;
  const origLoggerLog = HoshikoLogger.log;

  const loggedEntries = [];
  HoshikoLogger.log = async (entry) => {
    loggedEntries.push(entry);
  };

  caseModel.GuildSequenceModel.findOneAndUpdate = async () => ({ seq: 99 });
  caseModel.CaseModel.create = async () => {
    throw new Error("MongoNetworkTimeoutException: connection lost");
  };

  try {
    let errorThrown = false;
    try {
      await caseModel.createCase({
        guildId,
        userId: "user-fail",
        modId: "mod-1",
        action: "ban",
        reason: "Test error log",
      });
    } catch (err) {
      errorThrown = true;
      assert.match(err.message, /MongoNetworkTimeoutException/);
    }

    assert.ok(errorThrown, "createCase no debe silenciar el error");
    assert.equal(
      loggedEntries.length,
      1,
      "Debe registrar 1 entrada de log estructurado",
    );
    assert.equal(loggedEntries[0].level, LogLevel.ERROR);
    assert.equal(loggedEntries[0].context, "AUDIT_CASE_PERSISTENCE");
    assert.equal(loggedEntries[0].guildId, guildId);
    assert.equal(loggedEntries[0].userId, "user-fail");
    assert.equal(loggedEntries[0].metadata?.action, "ban");
  } finally {
    caseModel.GuildSequenceModel.findOneAndUpdate = origSeqFindOneAndUpdate;
    caseModel.CaseModel.create = origCaseCreate;
    HoshikoLogger.log = origLoggerLog;
  }
});

test("AUD-13: /cases trunca de forma segura si la longitud supera 4000 caracteres con mensaje explicativo", async () => {
  let editReplyPayload = null;
  const origGetRecentCases = caseModel.getRecentCases;

  const longCases = Array.from({ length: 45 }, (_, i) => ({
    caseId: 45 - i,
    guildId: "guild-trunc-test",
    userId: `user-long-${i}`,
    modId: "mod-1",
    action: "warn",
    reason: `Razón de infracción #${45 - i}: Usuario incurrió en conducta inapropiada`,
    source: "manual",
    createdAt: new Date(Date.now() - i * 60000),
  }));

  caseModel.getRecentCases = async () => longCases;

  const mockInteraction = {
    inGuild: () => true,
    guild: {
      id: "guild-trunc-test",
      name: "Servidor Test Truncado",
      ownerId: "owner-1",
    },
    member: {
      id: "mod-1",
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.ModerateMembers,
    },
    user: { id: "mod-1", tag: "Mod#0001" },
    options: {
      getUser: () => null,
      getInteger: () => 25,
    },
    editReply: async (payload) => {
      editReplyPayload = payload;
    },
  };

  try {
    await casesCmd.execute(mockInteraction, {});

    assert.ok(editReplyPayload?.embeds?.length, "Debe responder con embed");
    const desc = editReplyPayload.embeds[0].data.description;
    assert.ok(
      desc.length <= 4000,
      `La descripción (${desc.length} chars) no debe exceder los 4000 caracteres`,
    );
    assert.match(
      desc,
      /\.\.\. y \d+ casos más/,
      "Debe incluir el mensaje explicativo de casos truncados",
    );
  } finally {
    caseModel.getRecentCases = origGetRecentCases;
  }
});

test("AUD-01: getCasesByUser y getRecentCases aplican orden determinista { createdAt: -1, caseId: -1 }", async () => {
  const origFind = caseModel.CaseModel.find;
  let sortCriteriaUser = null;
  let sortCriteriaRecent = null;

  caseModel.CaseModel.find = (filter) => ({
    sort: (sortObj) => {
      if (filter.userId) {
        sortCriteriaUser = sortObj;
      } else {
        sortCriteriaRecent = sortObj;
      }
      return {
        limit: () => ({
          lean: async () => [],
        }),
      };
    },
  });

  try {
    await caseModel.getCasesByUser("g-1", "u-1", 5);
    await caseModel.getRecentCases("g-1", 5);

    assert.deepEqual(
      sortCriteriaUser,
      { createdAt: -1, caseId: -1 },
      "getCasesByUser debe ordenar por { createdAt: -1, caseId: -1 }",
    );
    assert.deepEqual(
      sortCriteriaRecent,
      { createdAt: -1, caseId: -1 },
      "getRecentCases debe ordenar por { createdAt: -1, caseId: -1 }",
    );
  } finally {
    caseModel.CaseModel.find = origFind;
  }
});
