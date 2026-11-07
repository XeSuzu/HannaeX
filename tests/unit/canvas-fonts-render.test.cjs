const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

test("Canvas Fonts: Registro y soporte multi-idioma (CJK, Símbolos, NerdFont, Emojis)", async () => {
  const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");

  const fontDir = path.resolve(__dirname, "../../apps/hoshiko/src/assets/fonts");

  // Registrar fuentes
  const toRegister = [
    { p: path.join(fontDir, "Nunito-Bold.ttf"), family: "BannerBold" },
    { p: path.join(fontDir, "Nunito-Regular.ttf"), family: "BannerReg" },
    { p: path.join(fontDir, "NotoColorEmoji.ttf"), family: "NotoColorEmoji" },
    { p: "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", family: "NotoSansCJK" },
    { p: "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc", family: "NotoSansCJKBold" },
    { p: "/usr/share/fonts/noto/NotoSansSymbols-Regular.ttf", family: "NotoSymbols" },
    { p: "/usr/share/fonts/noto/NotoSansSymbols2-Regular.ttf", family: "NotoSymbols2" },
    { p: "/usr/share/fonts/noto/NotoSansMath-Regular.ttf", family: "NotoMath" },
    { p: "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf", family: "NerdFont" },
  ];

  for (const font of toRegister) {
    try {
      GlobalFonts.registerFromPath(font.p, font.family);
    } catch (err) {
      // Ignorar si ya fue registrada
    }
  }

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext("2d");

  const fontStack = '"BannerBold","BannerReg","NotoSansCJK","NotoSansCJKBold","NotoSymbols","NotoSymbols2","NotoMath","NerdFont","NotoColorEmoji",sans-serif';
  ctx.font = `24px ${fontStack}`;

  // Prueba con caracteres especiales de Discord
  const testString = "Hoshiko 🌸 夜桜 ✦ 星子 ⚡ ∑ 🎲 \uf120";
  const metrics = ctx.measureText(testString);

  assert.ok(metrics.width > 0, "Debe medir el ancho correctamente");
  
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(testString, 50, 100);

  const pngBuffer = await canvas.encode("png");
  assert.ok(pngBuffer.length > 1000, "Debe generar un buffer PNG válido");
});

test("LevelBanners: generateServerRankBanner renderiza correctamente con fuentes expandidas (CJK, Emojis, Símbolos)", async () => {
  const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");
  const { generateServerRankBanner } = require(path.join(buildDir, "Utils/levelBanners/serverRank.js"));
  const { createCanvas } = require("@napi-rs/canvas");

  // Crear un buffer de avatar simple de 128x128
  const avCanvas = createCanvas(128, 128);
  const avCtx = avCanvas.getContext("2d");
  avCtx.fillStyle = "#FFB7C5";
  avCtx.fillRect(0, 0, 128, 128);
  const avatarBuffer = await avCanvas.encode("png");

  // Nombre exótico con japonés, chino, símbolos raros, nerd font y emoji
  const exoticUsername = "星子 🌸 夜桜 ✦ ⚡ 🎲 \uf120";

  const banner = await generateServerRankBanner({
    username: exoticUsername,
    avatarBuffer,
    level: 42,
    rank: 1,
    xpCurrent: 850,
    xpNeeded: 1200,
    progressPercent: 70,
    messagesSent: 1540,
    voiceMinutes: 320,
    backgroundTheme: "default",
  });

  assert.notEqual(banner, null, "El banner debe generarse con éxito");
  assert.equal(banner.name, "server-rank.png");
  assert.ok(banner.attachment, "Debe contener el buffer de la imagen");
});
