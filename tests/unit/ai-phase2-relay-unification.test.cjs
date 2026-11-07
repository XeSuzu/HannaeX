const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { VisualTagParser } = require(path.join(buildDir, "Core/AI/Media/VisualTagParser.js"));
const { EmbedComposer } = require(path.join(buildDir, "Core/AI/Presentation/EmbedComposer.js"));
const { ConversationStatusManager } = require(path.join(buildDir, "Core/AI/Status/ConversationStatusManager.js"));

test("Phase 2 - VisualTagParser: Extrae la consulta visual de una sola pasada sin segundas llamadas", () => {
  const sampleResponse = `
La nebulosa de Carina es una de las regiones de formación estelar más grandes y brillantes del cielo nocturno. Alberga estrellas extremadamente masivas como Eta Carinae.

[VISUAL_SEARCH: "carina nebula james webb"]
  `.trim();

  const parsed = VisualTagParser.parse(sampleResponse);
  assert.equal(parsed.visualQuery, "carina nebula james webb");
  assert.equal(parsed.cleanText.includes("[VISUAL_SEARCH"), false);
  assert.match(parsed.cleanText, /nebulosa de Carina/);

  // Respuesta sin tag
  const plainResponse = "TypeScript añade tipado estático opcional a JavaScript.";
  const plainParsed = VisualTagParser.parse(plainResponse);
  assert.equal(plainParsed.visualQuery, null);
  assert.equal(plainParsed.cleanText, plainResponse);
});

test("Phase 2 - EmbedComposer: Divide en máximo 3 embeds sin paginación obligatoria", () => {
  const shortText = "Esta es una respuesta corta y dulce ♡";
  const embedsShort = EmbedComposer.compose(shortText, {
    footerText: "Hoshiko AI Test",
  });

  assert.equal(embedsShort.length, 1);
  assert.equal(embedsShort[0].data.description, shortText);
  assert.equal(embedsShort[0].data.footer.text, "Hoshiko AI Test");

  // Texto extenso
  const longText = "A".repeat(4500);
  const embedsLong = EmbedComposer.compose(longText);
  assert.equal(embedsLong.length >= 2 && embedsLong.length <= 3, true);
});

test("Phase 2 - ConversationStatusManager: Frases cálidas de personalidad Hoshiko", () => {
  const p1 = ConversationStatusManager.getStatusPhrase("default");
  assert.match(p1, /momentito|pensando|ideas|atención/i);

  const p2 = ConversationStatusManager.getStatusPhrase("memory");
  assert.match(p2, /recuerdos|contaste/i);

  const p3 = ConversationStatusManager.getStatusPhrase("research");
  assert.match(p3, /investigando|confiable|profundizando/i);

  const embed = ConversationStatusManager.createStatusEmbed("memory");
  assert.notEqual(embed.data.description, undefined);
});
