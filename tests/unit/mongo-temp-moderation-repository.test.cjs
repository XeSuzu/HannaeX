const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { test } = require("node:test");

const buildRoot = process.env.TEMP_MODERATION_TEST_BUILD_DIR;
if (!buildRoot) {
  throw new Error(
    "Set TEMP_MODERATION_TEST_BUILD_DIR to the isolated CommonJS compilation output.",
  );
}

const adapterPath = path.join(
  buildRoot,
  "src/Services/temp-moderation/adapters/MongoTempModerationRepository.js",
);
const fakeCollectionPath = path.join(
  buildRoot,
  "tests/support/FakeMongoCollection.js",
);
let MongoTempModerationRepository;
let FakeMongoCollection;
let policy;

const NOW = new Date("2026-03-04T05:06:07.000Z");
const EXPIRES_AT = new Date(NOW.getTime() - 1000);
const EXPECTED_TIMEOUT_UNTIL = new Date(NOW.getTime() - 500);

function makeDocument(overrides = {}) {
  return {
    _id: "moderation-1",
    guildId: "guild-1",
    userId: "user-1",
    moderationType: "mute",
    expiresAt: EXPIRES_AT,
    expectedTimeoutUntil: EXPECTED_TIMEOUT_UNTIL,
    status: "pending",
    revision: 4,
    attempts: 0,
    ...overrides,
  };
}

function makeHarness(document = makeDocument()) {
  const collection = new FakeMongoCollection([document]);
  let tokenSequence = 0;
  const repository = new MongoTempModerationRepository(collection, {
    createLeaseToken: () => `mongo-lease-${++tokenSequence}`,
  });
  return { repository, collection };
}

function claimInput(document = makeDocument(), overrides = {}) {
  return {
    recordId: String(document.id ?? document._id),
    expectedExpiresAt: document.expiresAt,
    expectedTimeoutUntil: document.expectedTimeoutUntil ?? null,
    expectedRevision: document.revision,
    now: NOW,
    ...overrides,
  };
}

async function claimedHarness() {
  const harness = makeHarness();
  const claimed = await harness.repository.claim(claimInput());
  assert.ok(claimed);
  return { ...harness, claimed };
}

test("adapter imports without loading service clients or opening connections", () => {
  const probe = [
    "const Module = require('node:module');",
    "const blocked = new Set(['discord.js', 'mongoose', 'mongodb', 'ioredis', 'bullmq']);",
    "const load = Module._load;",
    "Module._load = function(request, parent, isMain) {",
    "  if (blocked.has(request)) throw new Error('blocked service import: ' + request);",
    "  return load.call(this, request, parent, isMain);",
    "};",
    "require(process.argv[1]);",
    "require(process.argv[2]);",
  ].join("\n");

  execFileSync(
    process.execPath,
    ["-e", probe, adapterPath, fakeCollectionPath],
    {
      stdio: "pipe",
    },
  );

  ({ MongoTempModerationRepository } = require(adapterPath));
  ({ FakeMongoCollection } = require(fakeCollectionPath));
  policy = require(adapterPath);
});

test("claim emits all eligibility conditions and one atomic update", async () => {
  const document = makeDocument();
  const harness = makeHarness(document);
  const result = await harness.repository.claim(claimInput(document));

  assert.ok(result);
  assert.equal(harness.collection.findOneAndUpdateCalls.length, 1);
  const [operation] = harness.collection.findOneAndUpdateCalls;
  const filter = operation.filter;
  const update = operation.update;

  assert.equal(filter._id, document._id);
  assert.equal(filter.status, "pending");
  assert.equal(filter.revision, document.revision);
  assert.deepEqual(filter.expiresAt, { $eq: document.expiresAt, $lte: NOW });
  assert.deepEqual(filter.expectedTimeoutUntil, EXPECTED_TIMEOUT_UNTIL);
  assert.deepEqual(filter.attempts, { $lt: 5 });
  assert.ok(Array.isArray(filter.$and));
  assert.equal(filter.$and.length, 2);
  for (const field of ["nextAttemptAt", "leaseUntil"]) {
    const eligibility = filter.$and.find((clause) =>
      clause.$or?.some((condition) => Object.hasOwn(condition, field)),
    );
    assert.ok(eligibility);
    assert.deepEqual(eligibility.$or, [
      { [field]: { $exists: false } },
      { [field]: null },
      { [field]: { $lte: NOW } },
    ]);
  }
  assert.deepEqual(update.$inc, { attempts: 1, revision: 1 });
  assert.equal(update.$set.leaseToken, result.leaseToken);
  assert.deepEqual(update.$set.leaseUntil, new Date(NOW.getTime() + 120_000));
  assert.deepEqual(update.$unset, { nextAttemptAt: "" });
  assert.deepEqual(harness.collection.inspect(document._id), {
    ...document,
    attempts: 1,
    revision: document.revision + 1,
    leaseToken: result.leaseToken,
    leaseUntil: new Date(NOW.getTime() + 120_000),
  });
});

test("a second claim cannot take a still-live lease; expired lease gets a new token", async () => {
  const harness = makeHarness();
  const first = await harness.repository.claim(claimInput());
  assert.ok(first);

  const secondWhileOwned = await harness.repository.claim(
    claimInput(first.record, { expectedRevision: first.record.revision }),
  );
  assert.equal(secondWhileOwned, null);

  const later = new Date(NOW.getTime() + policy.MODERATION_LEASE_MS);
  const afterExpiry = await harness.repository.claim(
    claimInput(first.record, {
      expectedRevision: first.record.revision,
      now: later,
    }),
  );
  assert.ok(
    afterExpiry,
    JSON.stringify({
      filter: harness.collection.findOneAndUpdateCalls.at(-1).filter,
      document: harness.collection.inspect("moderation-1"),
    }),
  );
  assert.notEqual(afterExpiry.leaseToken, first.leaseToken);
  assert.equal(afterExpiry.record.attempts, 2);
  assert.equal(harness.collection.inspect("moderation-1").revision, 6);
});

test("claim refuses a record that already reached the five-claim limit", async () => {
  const document = makeDocument({ attempts: policy.MODERATION_MAX_ATTEMPTS });
  const harness = makeHarness(document);
  const result = await harness.repository.claim(claimInput(document));

  assert.equal(result, null);
  assert.equal(harness.collection.findOneAndUpdateCalls.length, 1);
  assert.equal(harness.collection.inspect(document._id).attempts, 5);
});

test("complete requires matching id, lease token, revision, and pending status", async () => {
  const { repository, collection, claimed } = await claimedHarness();
  const base = {
    recordId: claimed.record.id,
    leaseToken: claimed.leaseToken,
    revision: claimed.record.revision,
    completedAt: NOW,
  };

  assert.equal(
    await repository.complete({ ...base, leaseToken: "wrong-token" }),
    false,
  );
  assert.equal(
    await repository.complete({ ...base, revision: base.revision - 1 }),
    false,
  );
  assert.equal(await repository.complete(base), true);

  const operation = collection.updateOneCalls.at(-1);
  assert.equal(operation.filter._id, claimed.record.id);
  assert.equal(operation.filter.leaseToken, claimed.leaseToken);
  assert.equal(operation.filter.revision, claimed.record.revision);
  assert.equal(operation.filter.status, "pending");
  assert.deepEqual(operation.update.$set, {
    status: "completed",
    completedAt: NOW,
  });
  assert.equal(collection.inspect(claimed.record.id).status, "completed");
  assert.ok(collection.inspect(claimed.record.id));
});

test("release and permanent failure reject a stale lease token or revision", async () => {
  const { repository, collection, claimed } = await claimedHarness();
  const release = {
    recordId: claimed.record.id,
    leaseToken: claimed.leaseToken,
    revision: claimed.record.revision,
    attempts: claimed.record.attempts,
    now: NOW,
    failureCode: "discord_unavailable",
  };

  assert.deepEqual(
    await repository.releaseForRetry({ ...release, leaseToken: "not-owner" }),
    { status: "leaseLost" },
  );
  assert.deepEqual(
    await repository.releaseForRetry({
      ...release,
      revision: release.revision - 1,
    }),
    { status: "leaseLost" },
  );
  assert.equal(
    await repository.markPermanentFailure({
      recordId: claimed.record.id,
      leaseToken: "not-owner",
      revision: claimed.record.revision,
      permanentFailureAt: NOW,
      failureCode: "forbidden",
    }),
    false,
  );
  assert.equal(
    await repository.markPermanentFailure({
      recordId: claimed.record.id,
      leaseToken: claimed.leaseToken,
      revision: claimed.record.revision - 1,
      permanentFailureAt: NOW,
      failureCode: "forbidden",
    }),
    false,
  );
  assert.equal(collection.inspect(claimed.record.id).status, "pending");
  assert.equal(collection.inspect(claimed.record.id).nextAttemptAt, undefined);
});

test("releaseForRetry uses the approved backoff for attempts one through four", async () => {
  for (const [attemptIndex, delay] of policy.MODERATION_RETRY_BACKOFF_MS.slice(
    0,
    4,
  ).entries()) {
    const document = makeDocument({
      revision: 10,
      attempts: attemptIndex + 1,
      leaseToken: "owned-lease",
      leaseUntil: new Date(NOW.getTime() + 60_000),
    });
    const harness = makeHarness(document);
    const result = await harness.repository.releaseForRetry({
      recordId: document._id,
      leaseToken: "owned-lease",
      revision: document.revision,
      attempts: document.attempts,
      now: NOW,
      failureCode: "discord_unavailable",
    });

    assert.deepEqual(result, {
      status: "retryScheduled",
      nextAttemptAt: new Date(NOW.getTime() + delay),
    });
    const stored = harness.collection.inspect(document._id);
    assert.equal(stored.nextAttemptAt.getTime(), NOW.getTime() + delay);
    assert.equal(stored.status, "pending");
    assert.equal(stored.leaseToken, undefined);
    assert.equal(stored.failureCode, "discord_unavailable");
    assert.equal(stored.revision, document.revision + 1);
  }
});

test("the fifth transient failure is permanent and does not schedule another retry", async () => {
  const document = makeDocument({
    attempts: policy.MODERATION_MAX_ATTEMPTS,
    leaseToken: "owned-lease",
    leaseUntil: new Date(NOW.getTime() + 60_000),
  });
  const harness = makeHarness(document);
  const result = await harness.repository.releaseForRetry({
    recordId: document._id,
    leaseToken: "owned-lease",
    revision: document.revision,
    attempts: document.attempts,
    now: NOW,
    failureCode: "gateway_timeout",
  });

  assert.deepEqual(result, {
    status: "permanentFailure",
    permanentFailureAt: NOW,
  });
  const stored = harness.collection.inspect(document._id);
  assert.equal(stored.status, "permanentFailure");
  assert.equal(stored.permanentFailureAt.getTime(), NOW.getTime());
  assert.equal(stored.failureCode, "gateway_timeout");
  assert.equal(stored.nextAttemptAt, undefined);
  assert.equal(stored.leaseToken, undefined);
  assert.equal(stored.revision, document.revision + 1);
});

test("markPermanentFailure keeps the document, updates revision, and never completes it", async () => {
  const { repository, collection, claimed } = await claimedHarness();
  const result = await repository.markPermanentFailure({
    recordId: claimed.record.id,
    leaseToken: claimed.leaseToken,
    revision: claimed.record.revision,
    permanentFailureAt: NOW,
    failureCode: "forbidden",
  });

  assert.equal(result, true);
  const document = collection.inspect(claimed.record.id);
  assert.ok(document);
  assert.equal(document.status, "permanentFailure");
  assert.equal(document.completedAt, undefined);
  assert.equal(document.failureCode, "forbidden");
  assert.equal(document.leaseToken, undefined);
  assert.equal(document.revision, claimed.record.revision + 1);
});

test("adapter rejects arbitrary error text and writes only allowlisted persistence fields", async () => {
  const { repository, collection, claimed } = await claimedHarness();
  await assert.rejects(
    repository.markPermanentFailure({
      recordId: claimed.record.id,
      leaseToken: claimed.leaseToken,
      revision: claimed.record.revision,
      permanentFailureAt: NOW,
      failureCode: "redis://user:password@host",
    }),
    { message: "invalid_moderation_failure_code" },
  );
  await assert.rejects(
    repository.releaseForRetry({
      recordId: claimed.record.id,
      leaseToken: claimed.leaseToken,
      revision: claimed.record.revision,
      attempts: claimed.record.attempts,
      now: NOW,
      failureCode: "raw discord error message with sensitive detail",
    }),
    { message: "invalid_moderation_failure_code" },
  );
  assert.equal(collection.updateOneCalls.length, 0);

  const update = collection.findOneAndUpdateCalls[0].update;
  assert.deepEqual(Object.keys(update).sort(), ["$inc", "$set", "$unset"]);
  assert.deepEqual(Object.keys(update.$set).sort(), [
    "leaseToken",
    "leaseUntil",
  ]);
  assert.deepEqual(Object.keys(update.$inc).sort(), ["attempts", "revision"]);
  assert.equal("reason" in update.$set, false);
  assert.equal("message" in update.$set, false);
  assert.equal("stack" in update.$set, false);
});
