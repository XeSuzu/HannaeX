const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createCanvas } = require("@napi-rs/canvas");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const {
  wrapTextSmart,
  formatSocialMentions,
  resolveBadgeColor,
  isSupportedImageAttachment,
  getSocialFont,
} = require(path.join(buildDir, "Commands/SlashCmds/Canvas/canvasPrimitives.js"));
const { generateInstaPost } = require(path.join(buildDir, "Commands/SlashCmds/Canvas/instaRenderer.js"));
const { generateTwitterPost } = require(path.join(buildDir, "Commands/SlashCmds/Canvas/twitterRenderer.js"));

test("Canvas Social - wrapTextSmart: respeta palabras completas, saltos de línea (\\n) y firstLineOffsetX sin cortar sílabas", () => {
  const canvas = createCanvas(1080, 200);
  const ctx = canvas.getContext("2d");
  ctx.font = getSocialFont(40, false);

  const sample = "Primera línea con palabras completas.\nSegunda línea después de un salto explícito.";
  const lines = wrapTextSmart(ctx, sample, 500, 0);

  assert.ok(lines.length >= 3, "Debe dividir en múltiples líneas respetando el ancho y \\n");
  assert.equal(
    lines.some((l) => l.startsWith("Segunda")),
    true,
    "Debe respetar el salto de línea explícito \\n",
  );

  // Palabra/URL extremadamente larga sin espacios debe partirse sin exceder maxWidth
  const longUrl = "https://example.com/" + "a".repeat(120);
  const urlLines = wrapTextSmart(ctx, longUrl, 400, 0);
  assert.ok(urlLines.length >= 2, "Debe dividir URLs más largas que maxWidth");
  for (const l of urlLines) {
    assert.ok(ctx.measureText(l).width <= 400, "Ningún fragmento debe desbordar maxWidth");
  }
});

test("Canvas Social - formatSocialMentions y resolveBadgeColor: limpia menciones e incluye Server Boosters", () => {
  const fakeGuild = {
    ownerId: "guild_owner_1",
    members: {
      cache: new Map([
        ["111222333", { displayName: "Alice", premiumSince: null }],
        ["444555666", { displayName: "BoosterBob", premiumSince: new Date() }],
      ]),
    },
    roles: {
      cache: new Map([["777888999", { name: "Moderadores" }]]),
    },
    channels: {
      cache: new Map([["999000111", { name: "general" }]]),
    },
  };

  const cleaned = formatSocialMentions(
    "Hola <@111222333> y <@!444555666> en <#999000111> con <@&777888999>",
    fakeGuild,
  );
  assert.equal(cleaned, "Hola @Alice y @BoosterBob en #general con @Moderadores");

  assert.equal(resolveBadgeColor({ id: "guild_owner_1" }, fakeGuild, "bot_1"), "#C0392B");
  assert.equal(resolveBadgeColor({ id: "444555666" }, fakeGuild, "bot_1"), "#9B59B6");
  assert.equal(resolveBadgeColor({ id: "bot_1" }, fakeGuild, "bot_1"), "#1D9BF0");
  assert.equal(resolveBadgeColor({ id: "111222333" }, fakeGuild, "bot_1"), null);
});

test("Canvas Social - isSupportedImageAttachment: valida MIME e impide archivos no imagen", () => {
  assert.equal(isSupportedImageAttachment({ contentType: "image/png", url: "https://a/b.png" }), true);
  assert.equal(isSupportedImageAttachment({ contentType: "image/jpeg", url: "https://a/b.jpg" }), true);
  assert.equal(isSupportedImageAttachment({ contentType: "image/webp", url: "https://a/b.webp" }), true);
  assert.equal(isSupportedImageAttachment({ contentType: "video/mp4", url: "https://a/b.mp4" }), false);
  assert.equal(isSupportedImageAttachment({ contentType: "application/pdf", url: "https://a/b.pdf" }), false);
  assert.equal(isSupportedImageAttachment(null), false);
});

test("Canvas Social - generateInstaPost y generateTwitterPost: renderizan PNG válidos sin llamadas de red externas", async () => {
  const localImg = path.resolve(__dirname, "../../apps/hoshiko/src/assets/images/banners/level-banners/bg-banner-1.jpg");

  const instaBuf = await generateInstaPost(
    "Probando post de Instagram con @Hoshiko y #Canvas ✨",
    "Hanna",
    localImg,
    "#D4AF37",
    localImg,
  );
  assert.ok(Buffer.isBuffer(instaBuf) && instaBuf.length > 5000);
  // Verificar firma PNG (89 50 4E 47)
  assert.equal(instaBuf[0], 0x89);
  assert.equal(instaBuf[1], 0x50);
  assert.equal(instaBuf[2], 0x4e);
  assert.equal(instaBuf[3], 0x47);

  const tweetBuf = await generateTwitterPost({
    text: "Probando tweet en X con @Hoshiko\nSegunda línea #TypeScript",
    displayName: "Hanna ★",
    username: "hanna",
    avatarUrl: localImg,
    badgeColor: "#9B59B6",
    attachmentUrl: localImg,
  });
  assert.ok(Buffer.isBuffer(tweetBuf) && tweetBuf.length > 5000);
  assert.equal(tweetBuf[0], 0x89);
  assert.equal(tweetBuf[1], 0x50);
  assert.equal(tweetBuf[2], 0x4e);
  assert.equal(tweetBuf[3], 0x47);
});
