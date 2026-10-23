const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

test("DB-02: UserHistoryManager utiliza $push atómico con $position: 0 y $slice: 40 sin invocar save()", async () => {
  const { UserHistoryManager } = require(path.join(buildRoot, "Database/tracking/UserHistoryManager.js"));
  const { UserHistory } = require(path.join(buildRoot, "Database/tracking/userTracking.models.js"));

  const origExists = UserHistory.exists;
  const origUpdateOne = UserHistory.updateOne;
  const origFindOne = UserHistory.findOne;

  const calls = [];

  try {
    UserHistory.exists = async (filter) => {
      calls.push({ method: "exists", filter });
      return null; // simular que no existe el registro duplicado
    };

    UserHistory.updateOne = async (filter, update, options) => {
      calls.push({ method: "updateOne", filter, update, options });
      return { acknowledged: true, modifiedCount: 1 };
    };

    UserHistory.findOne = async () => {
      throw new Error("findOne NO debe ser llamado para mutaciones en addUser");
    };

    await UserHistoryManager.addUser("u-100", {
      username: "hannae",
      discriminator: "0001",
      tag: "hannae#0001",
      avatarUrl: "https://example.com/avatar.png",
      source: "global",
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, "exists");
    assert.equal(calls[1].method, "updateOne");
    assert.deepEqual(calls[1].filter, { userId: "u-100" });
    assert.equal(calls[1].options?.upsert, true);

    const pushOp = calls[1].update?.$push?.records;
    assert.ok(pushOp, "Debe contener $push.records");
    assert.equal(pushOp.$position, 0, "$position debe ser 0 para prepender");
    assert.equal(pushOp.$slice, 40, "$slice debe ser 40");
    assert.equal(pushOp.$each.length, 1);
    assert.equal(pushOp.$each[0].username, "hannae");
  } finally {
    UserHistory.exists = origExists;
    UserHistory.updateOne = origUpdateOne;
    UserHistory.findOne = origFindOne;
  }
});

test("DB-02: AvatarHistoryManager utiliza $push atómico con $position: 0 y $slice: 30 sin invocar save()", async () => {
  const { AvatarHistoryManager } = require(path.join(buildRoot, "Database/tracking/AvatarHistoryManager.js"));
  const { AvatarHistory } = require(path.join(buildRoot, "Database/tracking/userTracking.models.js"));

  const origExists = AvatarHistory.exists;
  const origUpdateOne = AvatarHistory.updateOne;
  const origFindOne = AvatarHistory.findOne;

  const calls = [];

  try {
    AvatarHistory.exists = async (filter) => {
      calls.push({ method: "exists", filter });
      return null;
    };

    AvatarHistory.updateOne = async (filter, update, options) => {
      calls.push({ method: "updateOne", filter, update, options });
      return { acknowledged: true, modifiedCount: 1 };
    };

    AvatarHistory.findOne = async () => {
      throw new Error("findOne NO debe ser llamado para mutaciones en addAvatar");
    };

    await AvatarHistoryManager.addAvatar("u-200", "https://example.com/new-avatar.png", {
      guildId: "g-100",
      guildName: "Hannae Server",
      source: "guild",
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, "exists");
    assert.equal(calls[1].method, "updateOne");
    assert.deepEqual(calls[1].filter, { userId: "u-200", guildId: "g-100" });
    assert.equal(calls[1].options?.upsert, true);

    const pushOp = calls[1].update?.$push?.avatars;
    assert.ok(pushOp, "Debe contener $push.avatars");
    assert.equal(pushOp.$position, 0, "$position debe ser 0");
    assert.equal(pushOp.$slice, 30, "$slice debe ser 30");
    assert.equal(pushOp.$each.length, 1);
    assert.equal(pushOp.$each[0].url, "https://example.com/new-avatar.png");
  } finally {
    AvatarHistory.exists = origExists;
    AvatarHistory.updateOne = origUpdateOne;
    AvatarHistory.findOne = origFindOne;
  }
});
