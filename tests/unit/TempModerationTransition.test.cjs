const test = require("node:test");
const assert = require("node:assert");
const { calculateNextTransition, MAX_ATTEMPTS } = require("../../dist/Services/TempModerationTransition.js");

test("calculateNextTransition - incrementa intentos y programa backoff de 30s", () => {
  const now = 1000000;
  const result = calculateNextTransition(0, { code: 50013 }, now);
  assert.strictEqual(result.attempts, 1);
  assert.strictEqual(result.status, "pending");
  assert.strictEqual(result.nextAttemptAt.getTime(), now + 30000);
});

test("calculateNextTransition - falla permanentemente al alcanzar MAX_ATTEMPTS", () => {
  const result = calculateNextTransition(MAX_ATTEMPTS - 1, { code: 50013 });
  assert.strictEqual(result.attempts, MAX_ATTEMPTS);
  assert.strictEqual(result.status, "permanentFailure");
  assert.strictEqual(result.failureCode, "MissingPermissions");
  assert.strictEqual(result.nextAttemptAt, undefined);
});

test("calculateNextTransition - detecta RateLimited y usa segundo escalon de backoff", () => {
  const now = 1000000;
  const result = calculateNextTransition(1, { status: 429 }, now);
  assert.strictEqual(result.attempts, 2);
  assert.strictEqual(result.status, "pending");
  assert.strictEqual(result.failureCode, undefined);
  assert.strictEqual(result.nextAttemptAt.getTime(), now + 60000);
});
