const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

test("OPS-03: createHealthServer se enlaza a 127.0.0.1 por defecto y responde a /healthz", async () => {
  const { createHealthServer } = require("../../dist/http/healthServer.js");
  const health = createHealthServer(() => true);
  const server = health.start();

  try {
    await new Promise((resolve) => {
      if (server.listening) {
        resolve();
      } else {
        server.once("listening", resolve);
      }
    });

    const address = server.address();
    assert.ok(address, "El servidor debe tener una dirección activa");
    assert.equal(address.address, "127.0.0.1", "Debe enlazarse estrictamente a 127.0.0.1");
    assert.ok(address.port > 0, "Debe tener un puerto asignado");

    // Realizar solicitud HTTP local
    const responseData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${address.port}/healthz`, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }));
      }).on("error", reject);
    });

    assert.equal(responseData.statusCode, 200);
    assert.deepEqual(responseData.body, { status: "ok" });
  } finally {
    await health.close();
  }
});

test("OPS-04: cleanOldLogs purga únicamente archivos de log .jsonl que exceden maxAgeDays", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hoshiko-log-clean-"));

  try {
    const oldFile = path.join(tempDir, "hoshiko-2020-01-01.jsonl");
    const recentFile = path.join(tempDir, "hoshiko-2099-01-01.jsonl");
    const nonLogFile = path.join(tempDir, "audit-report.txt");

    fs.writeFileSync(oldFile, '{"test":"old"}\n');
    fs.writeFileSync(recentFile, '{"test":"recent"}\n');
    fs.writeFileSync(nonLogFile, "do not touch\n");

    const { cleanOldLogs } = require("../../dist/scripts/cronJobs.js");
    const result = await cleanOldLogs({
      logDir: tempDir,
      maxAgeDays: 14,
    });

    assert.equal(result.errors.length, 0, `No debe haber errores: ${result.errors.join(", ")}`);
    assert.ok(result.deletedFiles.includes("hoshiko-2020-01-01.jsonl"), "Debe purgar el archivo antiguo");
    assert.ok(result.skippedFiles.includes("hoshiko-2099-01-01.jsonl"), "Debe preservar el archivo reciente");
    assert.ok(result.skippedFiles.includes("audit-report.txt"), "Debe ignorar archivos que no siguen el patrón hoshiko-*.jsonl");

    assert.equal(fs.existsSync(oldFile), false, "El archivo antiguo debe haber sido eliminado del disco");
    assert.equal(fs.existsSync(recentFile), true, "El archivo reciente debe permanecer en el disco");
    assert.equal(fs.existsSync(nonLogFile), true, "El archivo no-log debe permanecer en el disco");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OPS-04: cleanOldLogs maneja directorios inexistentes sin lanzar excepciones", async () => {
  const nonExistentDir = path.join(os.tmpdir(), "non-existent-dir-" + Date.now());
  const { cleanOldLogs } = require("../../dist/scripts/cronJobs.js");

  const result = await cleanOldLogs({
    logDir: nonExistentDir,
    maxAgeDays: 14,
  });

  assert.deepEqual(result, { deletedFiles: [], skippedFiles: [], errors: [] });
});
