const test = require("node:test");
const assert = require("node:assert");
const {
  generateStandardInviteUrl,
  generateAdminInviteUrl,
  isValidSupportUrl,
  buildSupportButton,
  buildInviteActionRow,
  RECOMMENDED_INVITE_PERMISSIONS,
  getRecommendedPermissionsBitfield,
} = require("../../dist/Utils/inviteUtils.js");
const { PermissionFlagsBits, PermissionsBitField, ButtonStyle } = require("discord.js");

test("generateStandardInviteUrl - genera enlace OAuth2 con scopes y permisos recomendados", () => {
  const clientId = "123456789012345678";
  const url = generateStandardInviteUrl(clientId);

  assert.ok(url.startsWith("https://discord.com/oauth2/authorize"));
  assert.ok(url.includes(`client_id=${clientId}`));
  assert.ok(url.includes("scope=bot%20applications.commands"));

  const expectedBitfield = PermissionsBitField.resolve(RECOMMENDED_INVITE_PERMISSIONS).toString();
  assert.ok(url.includes(`permissions=${expectedBitfield}`));

  // No debe incluir permiso de Administrador ni MentionEveryone
  const resolved = new PermissionsBitField(getRecommendedPermissionsBitfield());
  assert.strictEqual(resolved.has(PermissionFlagsBits.Administrator), false);
  assert.strictEqual(resolved.has(PermissionFlagsBits.MentionEveryone), false);

  // Debe incluir los permisos necesarios verificados
  assert.strictEqual(resolved.has(PermissionFlagsBits.ViewChannel), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.SendMessages), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.EmbedLinks), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.AttachFiles), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.ManageMessages), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.ManageRoles), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.ModerateMembers), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.KickMembers), true);
  assert.strictEqual(resolved.has(PermissionFlagsBits.BanMembers), true);
});

test("generateAdminInviteUrl - genera enlace OAuth2 con permiso de Administrador", () => {
  const clientId = "987654321098765432";
  const url = generateAdminInviteUrl(clientId);

  assert.ok(url.startsWith("https://discord.com/oauth2/authorize"));
  assert.ok(url.includes(`client_id=${clientId}`));
  assert.ok(url.includes("scope=bot%20applications.commands"));
  assert.ok(url.includes("permissions=8")); // 8 = Administrator
});

test("isValidSupportUrl - valida URLs de soporte y rechaza placeholders", () => {
  assert.strictEqual(isValidSupportUrl("https://discord.gg/hoshiko"), true);
  assert.strictEqual(isValidSupportUrl("https://discord.com/invite/abcdef"), true);
  assert.strictEqual(isValidSupportUrl("https://discord.gg/abc-123_xyz"), true);

  // Rechazo de no-Discord URLs
  assert.strictEqual(isValidSupportUrl("https://google.com"), false);
  assert.strictEqual(isValidSupportUrl("https://github.com/Hanna/HannaeX"), false);

  // Rechazo de entradas vacías y placeholders
  assert.strictEqual(isValidSupportUrl(undefined), false);
  assert.strictEqual(isValidSupportUrl(""), false);
  assert.strictEqual(isValidSupportUrl("   "), false);
  assert.strictEqual(isValidSupportUrl("https://discord.gg/tuserver"), false);
  assert.strictEqual(isValidSupportUrl("https://discord.gg/YOUR_INVITE"), false);
  assert.strictEqual(isValidSupportUrl("https://discord.gg/ejemplo"), false);
  assert.strictEqual(isValidSupportUrl("invalido_sin_protocolo"), false);
});

test("buildSupportButton - genera botón deshabilitado cuando no hay soporte configurado", () => {
  const button = buildSupportButton(undefined);
  const json = button.toJSON();

  assert.strictEqual(json.style, ButtonStyle.Secondary);
  assert.strictEqual(json.custom_id, "invite_support_soon");
  assert.strictEqual(json.label, "Soporte · Muy pronto");
  assert.strictEqual(json.disabled, true);
  assert.strictEqual(json.url, undefined);
});

test("buildSupportButton - genera botón de enlace funcional cuando la URL es válida", () => {
  const supportUrl = "https://discord.gg/hoshikocommunity";
  const button = buildSupportButton(supportUrl);
  const json = button.toJSON();

  assert.strictEqual(json.style, ButtonStyle.Link);
  assert.strictEqual(json.url, supportUrl);
  assert.strictEqual(json.label, "Servidor de Soporte");
  assert.strictEqual(Boolean(json.disabled), false);
});

test("buildInviteActionRow - compone los tres botones de forma consistente", () => {
  const clientId = "111222333444555666";
  const row = buildInviteActionRow(clientId, undefined);
  const json = row.toJSON();

  assert.strictEqual(json.components.length, 3);

  // Botón 0: Invitación estándar recomendada
  assert.strictEqual(json.components[0].style, ButtonStyle.Link);
  assert.ok(json.components[0].url.includes("scope=bot%20applications.commands"));
  assert.strictEqual(json.components[0].label, "Invitar a Hoshiko");

  // Botón 1: Invitación con administrador
  assert.strictEqual(json.components[1].style, ButtonStyle.Link);
  assert.ok(json.components[1].url.includes("permissions=8"));
  assert.strictEqual(json.components[1].label, "Permisos Completos (Admin)");

  // Botón 2: Fallback de soporte
  assert.strictEqual(json.components[2].style, ButtonStyle.Secondary);
  assert.strictEqual(json.components[2].label, "Soporte · Muy pronto");
  assert.strictEqual(json.components[2].disabled, true);
});
