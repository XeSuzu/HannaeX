const test = require("node:test");
const assert = require("node:assert");
const { safeEmoji, truncate } = require("../../dist/Utils/discordSafety.js");

test("safeEmoji - valida y preserva emojis Unicode estándar y variantes", () => {
  const validUnicodeEmojis = [
    "🔹", "🌸", "🐾", "🚨", "🛡️", "📜", "1️⃣", "ℹ️",
    "🛠️", "❓", "🏆", "⚙️", "⌨️", "🖤", "🔥", "💜",
    "🌌", "🌈", "👑", "💬", "📖", "✨", "📌", "🔗"
  ];

  for (const emoji of validUnicodeEmojis) {
    const validated = safeEmoji(emoji);
    assert.strictEqual(
      validated,
      emoji,
      `Emoji Unicode ${emoji} debe ser aceptado y retornado intacto`
    );
  }
});

test("safeEmoji - valida y acepta emojis personalizados de Discord", () => {
  const validDiscordEmojis = [
    "<:hoshiko_sparkle:123456789012345678>",
    "<a:hoshiko_party:987654321098765432>",
    "123456789012345678", // Snowflake ID directo
  ];

  for (const emoji of validDiscordEmojis) {
    assert.strictEqual(safeEmoji(emoji), emoji);
  }
});

test("safeEmoji - rechaza caracteres tipográficos y no estándar", () => {
  const invalidCharacters = [
    "▸", // U+25B8 - Causa principal de COMPONENT_INVALID_EMOJI
    "›", // U+203A
    "❯", // U+276F
    "·", // U+00B7
    "•", // Bullet
    "-",
    ">",
    "abc",
    "test",
    "",
    "   ",
    null,
    undefined,
  ];

  for (const char of invalidCharacters) {
    assert.strictEqual(
      safeEmoji(char),
      undefined,
      `El carácter '${char}' debe ser rechazado y devolver undefined`
    );
  }
});

test("truncate - preserva texto dentro de los límites y recorta con elipsis cuando excede", () => {
  assert.strictEqual(truncate("Hola Mundo", 20), "Hola Mundo");
  assert.strictEqual(truncate("12345", 5), "12345");

  const longText = "a".repeat(100);
  const truncated = truncate(longText, 50);
  assert.strictEqual(truncated.length, 50);
  assert.ok(truncated.endsWith("…"));

  assert.strictEqual(truncate(null, 10), "");
  assert.strictEqual(truncate(undefined, 10), "");
  assert.strictEqual(truncate(12345, 10), "12345");
});
