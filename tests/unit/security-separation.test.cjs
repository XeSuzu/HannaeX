const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

const fs = require("node:fs");

test("SEP-01: Hoshiko purga completamente listeners y servicios exclusivos de Security", () => {
  const purgedPaths = [
    "Events/Client/Guilds/antiNukeRoles.js",
    "Events/Client/Guilds/antiNukeChannels.js",
    "Events/Client/Guilds/honeypotHandler.js",
    "Features/sentinelNetwork.js",
    "Security/Defense/antiraid.js",
    "Features/automod/raidAlertManager.js",
    "Database/moderation/globalBlacklist.model.js",
    "Database/moderation/raidEpisode.model.js",
  ];

  for (const relPath of purgedPaths) {
    const fullPath = path.join(buildRoot, relPath);
    assert.equal(
      fs.existsSync(fullPath),
      false,
      `El archivo residual ${relPath} debe haber sido eliminado de Hoshiko en Fase 2`,
    );
  }
});

test("SEP-02: Las funcionalidades especializadas de seguridad operan exclusivamente en apps/hoshiko-security", async () => {
  const securityDistPath = path.join(__dirname, "../../apps/hoshiko-security/dist");

  const { SentinelNetwork } = require(path.join(securityDistPath, "modules/sentinel/SentinelNetwork.js"));
  const { AntiRaid } = require(path.join(securityDistPath, "modules/antiraid/AntiRaid.js"));
  const { AntiNukeManager } = require(path.join(securityDistPath, "modules/antinuke/AntiNukeManager.js"));
  const { LockdownManager } = require(path.join(securityDistPath, "modules/lockdown/lockdownManager.js"));

  assert.ok(SentinelNetwork, "SentinelNetwork debe existir en Hoshiko Security");
  assert.ok(AntiRaid, "AntiRaid debe existir en Hoshiko Security");
  assert.ok(AntiNukeManager, "AntiNukeManager debe existir en Hoshiko Security");
  assert.ok(LockdownManager, "LockdownManager debe existir en Hoshiko Security");
});

test("SEP-03: Hoshiko Security no se inicia automáticamente sin token propio", async () => {
  const securityDistPath = path.join(__dirname, "../../apps/hoshiko-security/dist");
  const { SecurityConfig } = require(path.join(securityDistPath, "config/SecurityConfig.js"));
  const { startSecurityBot } = require(path.join(securityDistPath, "index.js"));

  // Guardar entorno previo
  const prevToken = process.env.HOSHIKO_SECURITY_TOKEN;
  delete process.env.HOSHIKO_SECURITY_TOKEN;

  // Recargar config para asegurar estado limpio
  SecurityConfig.load();

  assert.equal(
    SecurityConfig.isConfigured(),
    false,
    "SecurityConfig.isConfigured() debe ser false cuando HOSHIKO_SECURITY_TOKEN está ausente",
  );

  const started = await startSecurityBot();
  assert.equal(
    started,
    false,
    "startSecurityBot() debe retornar false y abortar inicio sin token",
  );

  // Restaurar entorno
  if (prevToken) {
    process.env.HOSHIKO_SECURITY_TOKEN = prevToken;
  }
});

test("SEP-04: Hoshiko no requiere HOSHIKO_SECURITY_TOKEN para funcionar", () => {
  const { AppConfig } = require(path.join(buildRoot, "App/config/AppConfig.js"));
  const env = AppConfig.load();

  // El schema de Hoshiko no requiere HOSHIKO_SECURITY_TOKEN
  assert.ok(env, "AppConfig de Hoshiko carga exitosamente");
  assert.equal(
    "HOSHIKO_SECURITY_TOKEN" in env,
    false,
    "El esquema de entorno de Hoshiko es independiente del token de Security",
  );
});

test("SEP-05: AutoMod convencional y filtros de palabras continúan operativos en Hoshiko", () => {
  const { normalizeText, checkBannedWords } = require(path.join(buildRoot, "Features/automod/wordFilter.js"));

  const clean = checkBannedWords("Hola a todos, bienvenidos al servidor!", ["palabramala"]);
  assert.equal(clean.hit, false, "Mensajes limpios deben ser permitidos por el filtro de palabras");

  const normalized = normalizeText("Hólá\u200B múndó\uFEFF con\u00AD tildes");
  assert.equal(normalized, "hola mundo con tildes", "La normalización de texto de AutoMod sigue operativa");
});

test("SEP-06: Comandos de AutoMod (/setup-automod, /wordfilter, /setup) usan dot-notation atómica sin sobrescribir securityModules", async () => {
  const { SettingsManager } = require(path.join(buildRoot, "Database/guild/SettingsManager.js"));
  const setupAutomodCmd = require(path.join(buildRoot, "Commands/SlashCmds/Moderation/setup-automod.js")).default;
  const wordfilterCmd = require(path.join(buildRoot, "Commands/SlashCmds/Moderation/wordfilter.js")).default;

  const capturedUpdates = [];
  const origGet = SettingsManager.getSettings;
  const origUpdate = SettingsManager.updateSettings;

  SettingsManager.getSettings = async () => ({
    guildId: "g-123",
    securityModules: {
      securityLevel: 3,
      antiSpam: true,
      antiLinks: true,
      antiRaid: true,
      antiNuke: true,
      antiAlt: true,
      wordFilter: false,
      aiModeration: true,
      aiMode: "shadow",
    },
    allowedLinks: [],
    bannedWords: [],
  });
  SettingsManager.updateSettings = async (_guildId, data) => {
    capturedUpdates.push(data);
    return data;
  };

  try {
    // 1. /setup-automod modulo
    await setupAutomodCmd.execute(
      {
        guild: { id: "g-123" },
        options: {
          getSubcommand: () => "modulo",
          getString: () => "antiLinks",
          getBoolean: () => false,
        },
        editReply: async () => {},
      },
      {},
    );
    assert.deepEqual(
      capturedUpdates[0],
      { "securityModules.antiLinks": false },
      "/setup-automod modulo debe usar dot-notation puntual y no reemplazar todo securityModules",
    );

    // 2. /setup-automod ai-mode
    await setupAutomodCmd.execute(
      {
        guild: { id: "g-123" },
        options: {
          getSubcommand: () => "ai-mode",
          getString: () => "enforce",
        },
        editReply: async () => {},
      },
      {},
    );
    assert.deepEqual(
      capturedUpdates[1],
      { "securityModules.aiMode": "enforce" },
      "/setup-automod ai-mode debe usar dot-notation puntual",
    );

    // 3. /wordfilter toggle
    await wordfilterCmd.execute({
      guildId: "g-123",
      options: {
        getSubcommand: () => "toggle",
        getBoolean: () => true,
      },
      editReply: async () => {},
    });
    assert.deepEqual(
      capturedUpdates[2],
      { "securityModules.wordFilter": true },
      "/wordfilter toggle debe usar dot-notation puntual sin reemplazar todo securityModules",
    );
  } finally {
    SettingsManager.getSettings = origGet;
    SettingsManager.updateSettings = origUpdate;
  }
});

test("SEP-07: Hoshiko Security registra episodios en memoria sin MongoDB y ejecuta acciones de raid", async () => {
  const securityDistPath = path.join(__dirname, "../../apps/hoshiko-security/dist");
  const {
    registerActiveEpisode,
    executeRaidAction,
  } = require(path.join(securityDistPath, "modules/antiraid/raidAlertManager.js"));
  const { SentinelNetwork } = require(path.join(securityDistPath, "modules/sentinel/SentinelNetwork.js"));

  // SentinelNetwork no bloquea cuando MongoDB está desconectado (readyState 0)
  const checkRes = await SentinelNetwork.checkMember({ id: "u-1", user: { tag: "u#1" }, bannable: true });
  assert.equal(checkRes, false);

  // Episodio registrado con formato suspects (de AntiRaid.ts) funciona en executeRaidAction
  const epId = "raid_test_ep_1";
  registerActiveEpisode(epId, {
    episodeId: epId,
    guildId: "g-sec",
    suspects: [{ id: "raider-1", username: "r1", accountAgeDays: 1, joinedSecondsAgo: 2 }],
    resolved: false,
  });

  let timedOutUser = null;
  const res = await executeRaidAction({
    guild: {
      id: "g-sec",
      members: {
        me: {
          permissions: { has: () => true },
          roles: { highest: { position: 50 } },
        },
        fetch: async (id) => ({
          id,
          permissions: { has: () => false },
          roles: { highest: { position: 1 } },
          timeout: async () => {
            timedOutUser = id;
          },
        }),
      },
    },
    episodeId: epId,
    action: "timeout",
    moderator: { id: "mod-1", tag: "Mod#0001" },
  });

  assert.equal(res.success, true);
  assert.equal(res.affectedCount, 1);
  assert.equal(timedOutUser, "raider-1");
});
