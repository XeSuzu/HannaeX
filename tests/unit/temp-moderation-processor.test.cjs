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

const processorPath = path.join(
  buildRoot,
  "src/Services/temp-moderation/TempModerationProcessor.js",
);
const repositoryPath = path.join(
  buildRoot,
  "tests/support/InMemoryTempModerationRepository.js",
);
const fakesPath = path.join(buildRoot, "tests/support/Fakes.js");
let harnessModules;

const NOW = new Date("2026-01-02T03:04:05.000Z");
const dueAt = new Date(NOW.getTime() - 1000);

function makeRecord(overrides = {}) {
  return {
    id: "moderation-1",
    guildId: "guild-1",
    userId: "user-1",
    moderationType: "ban",
    expiresAt: dueAt,
    expectedTimeoutUntil: null,
    status: "pending",
    revision: 0,
    leaseToken: null,
    leaseUntil: null,
    attempts: 0,
    nextAttemptAt: null,
    completedAt: null,
    permanentFailureAt: null,
    failureCode: null,
    ...overrides,
  };
}

function makeHarness(record = makeRecord(), options = {}) {
  const {
    TempModerationProcessor,
    InMemoryTempModerationRepository,
    FakeClock,
    FakeModerationGateway,
    FakeModerationLogger,
  } = harnessModules;
  let tokenNumber = 0;
  const repository = new InMemoryTempModerationRepository([record], {
    createLeaseToken: () => `lease-${++tokenNumber}`,
  });
  const gateway = new FakeModerationGateway();
  const clock = new FakeClock(NOW);
  const logger = new FakeModerationLogger();
  const processor = new TempModerationProcessor({
    repository,
    gateway,
    clock,
    logger,
    ...options,
  });

  return { processor, repository, gateway, clock, logger };
}

function expirationInput(record = makeRecord()) {
  return {
    recordId: record.id,
    expectedExpiresAt: record.expiresAt,
    expectedTimeoutUntil: record.expectedTimeoutUntil,
    expectedRevision: record.revision,
  };
}

test("processor and fakes do not import production service clients", () => {
  const probe = [
    "const Module = require('node:module');",
    "const blocked = new Set(['discord.js', 'mongoose', 'ioredis', 'bullmq']);",
    "const load = Module._load;",
    "Module._load = function(request, parent, isMain) {",
    "  if (blocked.has(request)) throw new Error('blocked external client import: ' + request);",
    "  return load.call(this, request, parent, isMain);",
    "};",
    "require(process.argv[1]);",
    "require(process.argv[2]);",
  ].join("\n");

  execFileSync(process.execPath, ["-e", probe, processorPath, fakesPath], {
    stdio: "pipe",
  });

  harnessModules = {
    ...require(processorPath),
    ...require(repositoryPath),
    ...require(fakesPath),
  };
});

test("due expiration is claimed, sent to the gateway, then completed", async () => {
  const harness = makeHarness();
  const result = await harness.processor.processExpiration(expirationInput());

  assert.deepEqual(result, { status: "completed", recordId: "moderation-1" });
  assert.equal(harness.repository.calls.claim, 1);
  assert.equal(harness.gateway.calls.length, 1);
  assert.deepEqual(harness.gateway.calls[0], {
    action: "removeBan",
    guildId: "guild-1",
    userId: "user-1",
    expectedTimeoutUntil: null,
  });
  assert.equal(harness.repository.claimInputs[0].now.getTime(), NOW.getTime());
  assert.equal(
    harness.repository.claimResults[0].leaseUntil.getTime(),
    NOW.getTime() + 120_000,
  );
  assert.equal(harness.repository.calls.complete, 1);
  assert.equal(harness.repository.inspect("moderation-1").status, "completed");
});

test("two consumers sharing a repository produce one effective gateway call", async () => {
  const harness = makeHarness();
  const secondConsumer = new harnessModules.TempModerationProcessor({
    repository: harness.repository,
    gateway: harness.gateway,
    clock: harness.clock,
    logger: harness.logger,
  });

  const results = await Promise.all([
    harness.processor.processExpiration(expirationInput()),
    secondConsumer.processExpiration(expirationInput()),
  ]);

  assert.equal(
    results.filter((result) => result.status === "completed").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "skipped").length,
    1,
  );
  assert.equal(harness.gateway.calls.length, 1);
  assert.equal(harness.repository.calls.complete, 1);
  assert.equal(harness.repository.inspect("moderation-1").attempts, 1);
});

test("a valid lease owned by another consumer is skipped without side effects", async () => {
  const record = makeRecord({
    leaseToken: "lease-owner",
    leaseUntil: new Date(NOW.getTime() + 60_000),
  });
  const harness = makeHarness(record);
  const result = await harness.processor.processExpiration(
    expirationInput(record),
  );

  assert.equal(result.status, "skipped");
  assert.equal(harness.gateway.calls.length, 0);
  assert.equal(harness.repository.calls.complete, 0);
  assert.equal(harness.repository.inspect("moderation-1").attempts, 0);
  assert.equal(
    harness.repository.inspect("moderation-1").leaseToken,
    "lease-owner",
  );
});

test("transient gateway failure releases the lease for retry, never completes", async () => {
  const harness = makeHarness();
  harness.gateway.failNext(
    new harnessModules.ModerationGatewayError("discord_unavailable", true),
  );

  const result = await harness.processor.processExpiration(expirationInput());
  const record = harness.repository.inspect("moderation-1");

  assert.equal(result.status, "retryScheduled");
  assert.equal(
    result.retryAt.toISOString(),
    new Date(NOW.getTime() + 30_000).toISOString(),
  );
  assert.equal(harness.repository.calls.releaseForRetry, 1);
  assert.equal(harness.repository.calls.complete, 0);
  assert.equal(record.status, "pending");
  assert.equal(record.leaseToken, null);
  assert.equal(record.nextAttemptAt.getTime(), NOW.getTime() + 30_000);
  assert.equal(record.failureCode, "discord_unavailable");
});

test("a released transient failure can be claimed again after retryAt", async () => {
  const harness = makeHarness();
  harness.gateway.failNext(
    new harnessModules.ModerationGatewayError("discord_unavailable", true),
  );

  const first = await harness.processor.processExpiration(expirationInput());
  assert.equal(first.status, "retryScheduled");
  assert.equal(harness.gateway.calls.length, 1);

  harness.clock.advanceBy(30_000);
  const retryableRecord = harness.repository.inspect("moderation-1");
  const second = await harness.processor.processExpiration(
    expirationInput(retryableRecord),
  );

  assert.equal(second.status, "completed");
  assert.equal(harness.gateway.calls.length, 2);
  assert.equal(harness.repository.calls.complete, 1);
});

test("permanent gateway failure is recorded without marking the record completed", async () => {
  const harness = makeHarness();
  harness.gateway.failNext(
    new harnessModules.ModerationGatewayError("forbidden", false),
  );

  const result = await harness.processor.processExpiration(expirationInput());
  const record = harness.repository.inspect("moderation-1");

  assert.deepEqual(result, {
    status: "permanentFailure",
    recordId: "moderation-1",
    errorCode: "forbidden",
  });
  assert.equal(harness.repository.calls.complete, 0);
  assert.equal(harness.repository.calls.releaseForRetry, 0);
  assert.equal(harness.repository.calls.permanent, 1);
  assert.equal(record.status, "permanentFailure");
  assert.equal(record.completedAt, null);
  assert.ok(record.permanentFailureAt instanceof Date);
});

test("completion happens only after the gateway action succeeds", async () => {
  const harness = makeHarness();
  const deferred = harness.gateway.deferNext();
  const processing = harness.processor.processExpiration(expirationInput());

  await deferred.started;
  assert.equal(harness.repository.calls.complete, 0);
  assert.equal(harness.repository.inspect("moderation-1").status, "pending");
  assert.ok(harness.repository.inspect("moderation-1").leaseToken);

  deferred.resolve();
  const result = await processing;

  assert.equal(result.status, "completed");
  assert.equal(harness.repository.calls.complete, 1);
  assert.equal(harness.repository.inspect("moderation-1").status, "completed");
});

test("future, stale, and already-completed expirations are no-ops", async (t) => {
  const future = makeRecord({ expiresAt: new Date(NOW.getTime() + 60_000) });
  const stale = makeRecord({ expiresAt: dueAt });
  const completed = makeRecord({ status: "completed", completedAt: NOW });
  const cases = [
    {
      name: "future record",
      record: future,
      input: expirationInput(future),
    },
    {
      name: "stale scan timestamp",
      record: stale,
      input: {
        recordId: stale.id,
        expectedExpiresAt: new Date(dueAt.getTime() - 1),
      },
    },
    {
      name: "completed record",
      record: completed,
      input: expirationInput(completed),
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const harness = makeHarness(scenario.record);
      const before = harness.repository.inspect(scenario.record.id);
      const result = await harness.processor.processExpiration(scenario.input);
      const after = harness.repository.inspect(scenario.record.id);

      assert.equal(result.status, "skipped");
      assert.equal(harness.gateway.calls.length, 0);
      assert.equal(harness.repository.calls.complete, 0);
      assert.equal(after.status, before.status);
      assert.equal(after.attempts, before.attempts);
      assert.equal(after.revision, before.revision);
      assert.equal(after.leaseToken, before.leaseToken);
    });
  }
});
