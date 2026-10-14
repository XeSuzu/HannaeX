#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Build the main project (populates dist/)
npm run build --prefix "$REPO_ROOT"

# 2. Compile the harness files to an isolated CommonJS temporary directory
TEMP_BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_BUILD_DIR"' EXIT

npx tsc \
  --outDir "$TEMP_BUILD_DIR" \
  --rootDir "$REPO_ROOT" \
  --module commonjs \
  --target es2022 \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --strict \
  "$REPO_ROOT/src/Services/temp-moderation/TempModerationProcessor.ts" \
  "$REPO_ROOT/src/Services/temp-moderation/adapters/MongoTempModerationRepository.ts" \
  "$REPO_ROOT/src/Services/temp-moderation/contracts/index.ts" \
  "$REPO_ROOT/tests/support/InMemoryTempModerationRepository.ts" \
  "$REPO_ROOT/tests/support/Fakes.ts" \
  "$REPO_ROOT/tests/support/FakeMongoCollection.ts"

# 3. Run all unit tests
TEMP_MODERATION_TEST_BUILD_DIR="$TEMP_BUILD_DIR" \
HANDLER_TEST_BUILD_DIR="$REPO_ROOT/dist" \
node --test \
  "$REPO_ROOT/tests/unit/temp-moderation-processor.test.cjs" \
  "$REPO_ROOT/tests/unit/mongo-temp-moderation-repository.test.cjs" \
  "$REPO_ROOT/tests/unit/load-handlers.test.cjs"
