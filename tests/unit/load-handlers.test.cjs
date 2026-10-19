const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR;
if (!buildRoot) {
  throw new Error(
    "Set HANDLER_TEST_BUILD_DIR to the isolated CommonJS compilation output.",
  );
}

const { loadHandlers } = require(
  path.join(buildRoot, "bootstrap/loadHandlers.js"),
);

function createFixtureDirectory(t, filenames) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hoshiko-handlers-"));
  for (const filename of filenames) {
    fs.writeFileSync(path.join(directory, filename), "// loader fixture\n");
  }
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("loadHandlers waits for async handlers and preserves discovery order", async (t) => {
  const directory = createFixtureDirectory(t, [
    "01-sync.js",
    "02-async.js",
    "03-database.js",
    "04-last.js",
    "05-mongo.ts",
    "ignored.d.ts",
    "ignored.js.map",
  ]);
  const order = [];
  const client = {};
  const asyncStarted = deferred();
  const finishAsync = deferred();
  let settled = false;

  const loading = loadHandlers(client, {
    handlersDir: directory,
    loadHandlerModule: (handlerPath) => {
      const filename = path.basename(handlerPath);
      order.push(`import:${filename}`);

      if (filename === "01-sync.js") {
        return (receivedClient) => {
          assert.equal(receivedClient, client);
          order.push("run:sync");
        };
      }
      if (filename === "02-async.js") {
        return {
          default: async (receivedClient) => {
            assert.equal(receivedClient, client);
            order.push("run:async:start");
            asyncStarted.resolve();
            await finishAsync.promise;
            order.push("run:async:finish");
          },
        };
      }
      if (filename === "04-last.js") {
        return () => order.push("run:last");
      }

      throw new Error(`Unexpected handler import: ${filename}`);
    },
    reportError: () => assert.fail("No handler should fail in this case"),
  });
  void loading.then(() => {
    settled = true;
  });

  await asyncStarted.promise;
  assert.equal(settled, false);
  assert.deepEqual(order, [
    "import:01-sync.js",
    "run:sync",
    "import:02-async.js",
    "run:async:start",
  ]);

  finishAsync.resolve();
  await loading;

  assert.equal(settled, true);
  assert.deepEqual(order, [
    "import:01-sync.js",
    "run:sync",
    "import:02-async.js",
    "run:async:start",
    "run:async:finish",
    "import:04-last.js",
    "run:last",
  ]);
});

test("loadHandlers reports individual import/handler failures and continues", async (t) => {
  const directory = createFixtureDirectory(t, [
    "01-import-reject.js",
    "02-handler-reject.ts",
    "03-database.js",
    "04-success.js",
    "05-mongo-handler.js",
    "ignored.d.ts",
    "ignored.js.map",
  ]);
  const attempts = [];
  const reported = [];
  const client = {};

  await loadHandlers(client, {
    handlersDir: directory,
    loadHandlerModule: async (handlerPath) => {
      const filename = path.basename(handlerPath);
      attempts.push(filename);
      if (filename === "01-import-reject.js") {
        throw new Error("import failed");
      }
      if (filename === "02-handler-reject.ts") {
        return async (receivedClient) => {
          assert.equal(receivedClient, client);
          throw new Error("handler failed");
        };
      }
      if (filename === "04-success.js") {
        return () => attempts.push("success-ran");
      }

      throw new Error(`Unexpected handler import: ${filename}`);
    },
    reportError: async (filename, error) => {
      reported.push({ filename, message: error.message });
    },
  });

  assert.deepEqual(attempts, [
    "01-import-reject.js",
    "02-handler-reject.ts",
    "04-success.js",
    "success-ran",
  ]);
  assert.deepEqual(reported, [
    { filename: "01-import-reject.js", message: "import failed" },
    { filename: "02-handler-reject.ts", message: "handler failed" },
  ]);
});
