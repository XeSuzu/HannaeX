const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

test("DB-01: guildConfig.model.ts huérfano fue eliminado de src/Database/guild/", () => {
  const guildConfigPath = path.join(__dirname, "../../src/Database/guild/guildConfig.model.ts");
  assert.equal(
    fs.existsSync(guildConfigPath),
    false,
    "El archivo guildConfig.model.ts no debe existir en el proyecto",
  );

  const serverConfigPath = path.join(__dirname, "../../src/Database/guild/serverConfig.model.ts");
  assert.equal(
    fs.existsSync(serverConfigPath),
    true,
    "serverConfig.model.ts debe existir como modelo canónico",
  );
});

test("DOC-01: AGENTS.md refleja las rutas y archivos reales del proyecto", () => {
  const agentsMdPath = path.join(__dirname, "../../AGENTS.md");
  const content = fs.readFileSync(agentsMdPath, "utf8");

  // Rutas obsoletas desincronizadas eliminadas
  assert.equal(content.includes("(`env.ts`)"), false);
  assert.equal(content.includes("registerGracefulShutdown.ts"), false);
  assert.equal(content.includes("canvasWorker.ts"), false);
  assert.equal(content.includes("guildConfig.model.ts"), false);

  // Rutas reales presentes
  assert.ok(content.includes("loadEnvironment.ts"));
  assert.ok(content.includes("shutdown.ts"));
  assert.ok(content.includes("spotifyRenderer.worker.ts"));
  assert.ok(content.includes("serverConfig.model.ts"));
});
