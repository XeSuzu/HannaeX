const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { generateServerRankBanner } = require(path.join(buildDir, "Utils/levelBanners/serverRank.js"));
const { generateVCRankBanner } = require(path.join(buildDir, "Utils/levelBanners/vcRank.js"));
const setupLevelsCmd = require(path.join(buildDir, "Commands/SlashCmds/Levels/setup-levels.js")).default;
const LevelConfig = require(path.join(buildDir, "Database/leveling/levelConfig.model.js")).default;
const { createCanvas } = require("@napi-rs/canvas");

test("Card Customization - Genera banner con fondo de imagen personalizado (object-fit: cover)", async () => {
  // Crear buffer de avatar simulado
  const avCanvas = createCanvas(128, 128);
  const avCtx = avCanvas.getContext("2d");
  avCtx.fillStyle = "#A855F7";
  avCtx.fillRect(0, 0, 128, 128);
  const avatarBuffer = await avCanvas.encode("png");

  // Crear buffer de imagen de fondo personalizada (proporción diferente 1200x800)
  const bgCanvas = createCanvas(1200, 800);
  const bgCtx = bgCanvas.getContext("2d");
  bgCtx.fillStyle = "#0F172A";
  bgCtx.fillRect(0, 0, 1200, 800);
  bgCtx.fillStyle = "#38BDF8";
  bgCtx.fillRect(100, 100, 400, 400);
  const customBgBuffer = await bgCanvas.encode("png");

  const banner = await generateServerRankBanner({
    username: "CustomPlayer",
    avatarBuffer,
    level: 15,
    rank: 3,
    xpCurrent: 1200,
    xpNeeded: 2000,
    progressPercent: 60,
    messagesSent: 850,
    voiceMinutes: 120,
    voiceLevel: 5,
    customBackgroundBuffer: customBgBuffer,
  });

  assert.notEqual(banner, null);
  assert.equal(banner.name, "server-rank.png");
  assert.ok(banner.attachment.length > 5000);
});

test("Card Customization - Genera banner con textos personalizados de nivel, panel y subtítulo", async () => {
  const avCanvas = createCanvas(128, 128);
  const avCtx = avCanvas.getContext("2d");
  avCtx.fillStyle = "#10B981";
  avCtx.fillRect(0, 0, 128, 128);
  const avatarBuffer = await avCanvas.encode("png");

  const banner = await generateServerRankBanner({
    username: "Hanna VIP",
    avatarBuffer,
    level: 99,
    rank: 1,
    xpCurrent: 9000,
    xpNeeded: 10000,
    progressPercent: 90,
    messagesSent: 15000,
    voiceMinutes: 4500,
    voiceLevel: 42,
    levelPrefix: "Rango",
    panelTopText: "TIER",
    panelBottomText: "CLAN",
    badgeSubtitle: "★ Comandante Supremo",
  });

  assert.notEqual(banner, null);
  assert.equal(banner.name, "server-rank.png");
  assert.ok(banner.attachment.length > 5000);

  // También verificar vcRank con textos personalizados
  const vcBanner = await generateVCRankBanner({
    username: "Hanna VIP",
    avatarBuffer,
    voiceLevel: 42,
    vcRank: 1,
    voiceMinutes: 4500,
    xpCurrent: 3000,
    xpNeeded: 4000,
    progressPercent: 75,
    levelPrefix: "Nivel",
    panelTopText: "VOZ",
    panelBottomText: "CLAN",
  });

  assert.notEqual(vcBanner, null);
  assert.equal(vcBanner.name, "vc-rank.png");
  assert.ok(vcBanner.attachment.length > 5000);
});

test("Card Customization - Estructura de modelo Mongoose y subcomando Slash", () => {
  // Verificar que el esquema de LevelConfig define cardCustomization
  const schemaPaths = LevelConfig.schema.paths;
  assert.ok(schemaPaths["cardCustomization.theme"]);
  assert.ok(schemaPaths["cardCustomization.customBackgroundUrl"]);
  assert.ok(schemaPaths["cardCustomization.enforced"]);
  assert.ok(schemaPaths["cardCustomization.levelPrefix"]);
  assert.ok(schemaPaths["cardCustomization.badgeSubtitle"]);
  assert.ok(schemaPaths["cardCustomization.panelTopText"]);
  assert.ok(schemaPaths["cardCustomization.panelBottomText"]);

  // Verificar que setup-levels incluye el subcomando 'card'
  const slashData = setupLevelsCmd.data.toJSON();
  const cardSubcmd = slashData.options.find((o) => o.name === "card");
  assert.ok(cardSubcmd, "El subcomando 'card' debe existir en /setup-levels");
  assert.equal(cardSubcmd.type, 1); // 1 = Subcommand
});
