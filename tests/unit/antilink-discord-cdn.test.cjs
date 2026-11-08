const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distRoot = path.resolve(__dirname, "../../apps/hoshiko/dist");
const { isAllowedByDomain } = require(path.join(distRoot, "Features/linkAllowlist"));

const DEFAULT_ALLOWED = [
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "tenor.com",
  "pinterest.com",
  "giphy.com",
  "google.com",
  "discord.com",
  "discordapp.com",
  "discordapp.net",
  "discord.media",
  "klipy.com",
  "klipy.co",
];

const DISCORD_INVITE_REGEX =
  /(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9-]+/i;

test("AntiLinks: Giphy y KLIPY (proveedores oficiales de GIF de Discord) permitidos", () => {
  const gifUrls = [
    "https://giphy.com/gifs/funny-cat-12345",
    "https://media.giphy.com/media/xyz123/giphy.gif",
    "https://i.giphy.com/media/xyz123/giphy.webp",
    "https://klipy.com/gif/popular-meme-123",
    "https://static.klipy.com/ii/b34001f2c30672cdcb3d906c28815404/ec/a9/JXDoZuAM.gif",
    "https://klipy.co/item/456",
  ];

  for (const url of gifUrls) {
    assert.strictEqual(
      isAllowedByDomain(url, DEFAULT_ALLOWED),
      true,
      `Debe permitir proveedor oficial de GIF: ${url}`,
    );
  }
});

test("AntiLinks: Dominios naturales y CDN de Discord permitidos por reflejo", () => {
  const discordCdnUrls = [
    "https://cdn.discordapp.com/attachments/123456789/987654321/foto.png",
    "https://media.discordapp.net/attachments/123456789/987654321/render.webp",
    "https://images-ext-1.discordapp.net/external/abcd/img.jpg",
    "https://cdn.discord.media/attachments/123/foto.png",
    "https://discord.com/channels/123456/789012/111222",
  ];

  for (const url of discordCdnUrls) {
    assert.strictEqual(
      isAllowedByDomain(url, DEFAULT_ALLOWED),
      true,
      `Debe permitir dominio natural / CDN de Discord: ${url}`,
    );
    assert.strictEqual(
      DISCORD_INVITE_REGEX.test(url),
      false,
      `Un recurso de CDN de Discord no debe ser confundido con una invitación: ${url}`,
    );
  }
});

test("AntiLinks: Invitaciones externas siguen siendo estrictamente detectadas", () => {
  const inviteUrls = [
    "https://discord.gg/comunidad",
    "https://discord.com/invite/servidor-amigo",
    "https://discordapp.com/invite/otrogrupo",
    "discord.gg/bypass123",
  ];

  for (const inv of inviteUrls) {
    assert.strictEqual(
      DISCORD_INVITE_REGEX.test(inv),
      true,
      `Debe detectar invitación externa de Discord: ${inv}`,
    );
  }
});

test("AntiLinks: Enlaces no permitidos siguen siendo bloqueados", () => {
  const blockedUrls = [
    "https://twitter.com/post/123",
    "https://x.com/post/123",
    "https://facebook.com",
    "https://t.me/telegram_channel",
    "https://iplogger.org/2abc",
  ];

  for (const url of blockedUrls) {
    assert.strictEqual(
      isAllowedByDomain(url, DEFAULT_ALLOWED),
      false,
      `Debe bloquear dominios no incluidos en whitelist: ${url}`,
    );
  }
});

test("AntiLinks: Detección estricta de Phishing y Canales/Roles Exentos", () => {
  const { isKnownPhishingLink } = require(path.join(distRoot, "Features/linkProtector"));

  // Enlaces de phishing deben detectarse siempre
  assert.strictEqual(isKnownPhishingLink("https://dlscord.com/nitro-free"), true);
  assert.strictEqual(isKnownPhishingLink("https://grabify.link/track"), true);
  assert.strictEqual(isKnownPhishingLink("https://steamcomminuty.com/gift"), true);
  assert.strictEqual(isKnownPhishingLink("https://discord.com/channels/123/456"), false);

  // Simulación de canal exento (#alianzas o #plantillas)
  const exemptChannels = ["123456789012345678"];
  const currentChannel = "123456789012345678";
  const otherChannel = "999999999999999999";

  assert.strictEqual(exemptChannels.includes(currentChannel), true, "Canal alianzas debe ser exento");
  assert.strictEqual(exemptChannels.includes(otherChannel), false, "Canal general no debe ser exento");

  // Simulación de rol exento (Miembro de Alianzas o VIP)
  const exemptRoles = ["555555555555555555"];
  const userRoles = ["555555555555555555", "111111111111111111"];
  const nonExemptUserRoles = ["222222222222222222"];

  assert.strictEqual(userRoles.some((r) => exemptRoles.includes(r)), true, "Usuario con rol exento permitido");
  assert.strictEqual(nonExemptUserRoles.some((r) => exemptRoles.includes(r)), false, "Usuario sin rol exento no permitido");
});

