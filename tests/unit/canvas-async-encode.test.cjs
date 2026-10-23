const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

// Los primeros 8 bytes de un archivo PNG válido
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("PERF-01: renderSpotifyCard genera un buffer PNG válido utilizando encode asíncrono", async () => {
  const { renderSpotifyCard } = require(path.join(buildRoot, "Renderers/spotifyRenderer.js"));

  const buffer = await renderSpotifyCard({
    title: "Test Song",
    artist: "Test Artist",
    album: "Test Album",
    coverUrl: null,
    progressMs: 30000,
    durationMs: 180000,
    username: "HannaUser",
  });

  assert.ok(Buffer.isBuffer(buffer), "El resultado debe ser un Buffer");
  assert.ok(buffer.length > 100, "El buffer debe tener contenido");
  assert.deepEqual(
    buffer.subarray(0, 8),
    PNG_MAGIC_BYTES,
    "El buffer generado debe tener la cabecera mágica de PNG",
  );
});

test("PERF-01: renderRobloxCard genera un buffer PNG válido utilizando encode asíncrono", async () => {
  const { renderRobloxCard } = require(path.join(buildRoot, "Renderers/robloxRenderer.js"));

  const buffer = await renderRobloxCard({
    gameName: "Blox Fruits",
    details: "Exploring the Sea",
    state: "In Game",
    coverUrl: null,
    elapsedMs: 120000,
    username: "RobloxPlayer",
  });

  assert.ok(Buffer.isBuffer(buffer), "El resultado debe ser un Buffer");
  assert.ok(buffer.length > 100, "El buffer debe tener contenido");
  assert.deepEqual(
    buffer.subarray(0, 8),
    PNG_MAGIC_BYTES,
    "El buffer generado debe tener la cabecera mágica de PNG",
  );
});

test("PERF-01: Todos los renderizadores de Canvas fueron migrados de .toBuffer() síncrono a .encode('png')", () => {
  // Inspección estática sobre dist/ o src/ para confirmar que no quede ningún toBuffer en Renderers ni Commands
  const srcDir = path.join(__dirname, "../../src");

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith(".ts")) {
        const content = fs.readFileSync(full, "utf8");
        assert.equal(
          content.includes('.toBuffer("image/png")'),
          false,
          `El archivo ${f} aún contiene .toBuffer("image/png")`,
        );
      }
    }
  }

  scanDir(srcDir);
});
