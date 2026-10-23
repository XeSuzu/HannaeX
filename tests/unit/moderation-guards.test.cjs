const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");

const buildRoot = process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");
const {
  checkModeratorPermissions,
  checkBotPermissions,
  canModerateTarget,
  canManageRole,
} = require(path.join(buildRoot, "Utils/moderationGuards.js"));

test("CMD-02: checkModeratorPermissions valida permisos internos y respeta al dueño del servidor", () => {
  // Caso 1: Fuera de servidor
  const dmInteraction = { inGuild: () => false, guild: null, user: { id: "u1" } };
  assert.equal(checkModeratorPermissions(dmInteraction, PermissionFlagsBits.BanMembers).ok, false);

  // Caso 2: Dueño del servidor (siempre permitido)
  const ownerInteraction = {
    inGuild: () => true,
    guild: { ownerId: "owner-1" },
    user: { id: "owner-1" },
  };
  assert.equal(checkModeratorPermissions(ownerInteraction, PermissionFlagsBits.BanMembers).ok, true);

  // Caso 3: Usuario con permiso explícito
  const modInteraction = {
    inGuild: () => true,
    guild: { ownerId: "owner-1" },
    user: { id: "mod-1" },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.BanMembers,
    },
  };
  assert.equal(checkModeratorPermissions(modInteraction, PermissionFlagsBits.BanMembers).ok, true);
  assert.equal(checkModeratorPermissions(modInteraction, PermissionFlagsBits.Administrator).ok, false);

  // Caso 4: Usuario sin permisos
  const plebInteraction = {
    inGuild: () => true,
    guild: { ownerId: "owner-1" },
    user: { id: "pleb-1" },
    memberPermissions: {
      has: () => false,
    },
  };
  const check = checkModeratorPermissions(plebInteraction, PermissionFlagsBits.BanMembers);
  assert.equal(check.ok, false);
  assert.match(check.reason, /No tienes los permisos requeridos/);
});

test("CMD-02: checkBotPermissions valida que el bot tenga los permisos necesarios", () => {
  const interactionWithPerms = {
    guild: {
      members: {
        me: {
          permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
        },
      },
    },
  };
  assert.equal(checkBotPermissions(interactionWithPerms, PermissionFlagsBits.BanMembers).ok, true);
  assert.equal(checkBotPermissions(interactionWithPerms, PermissionFlagsBits.Administrator).ok, false);
});

test("CMD-02: canModerateTarget previene auto-sanciones, ataques al bot/owner y valida jerarquía estricta", () => {
  const guild = {
    ownerId: "owner-1",
    client: { user: { id: "bot-id" } },
    members: {
      me: {
        id: "bot-id",
        roles: { highest: { position: 50 } },
      },
    },
  };

  const createMember = (id, highestPos) => ({
    id,
    guild,
    roles: { highest: { position: highestPos } },
  });

  const moderator = createMember("mod-1", 40);
  const targetSubordinate = createMember("user-1", 20);
  const targetSuperior = createMember("admin-1", 45);
  const targetPeer = createMember("peer-1", 40);
  const botMember = createMember("bot-id", 50);
  const ownerMember = createMember("owner-1", 99);

  // 1. Auto-sanción
  assert.equal(canModerateTarget(moderator, moderator).canModerate, false);

  // 2. Moderar al bot
  assert.equal(canModerateTarget(moderator, botMember).canModerate, false);

  // 3. Moderar al owner
  assert.equal(canModerateTarget(moderator, ownerMember).canModerate, false);

  // 4. Moderar a un superior o igual (debe fallar)
  assert.equal(canModerateTarget(moderator, targetSuperior).canModerate, false);
  assert.equal(canModerateTarget(moderator, targetPeer).canModerate, false);

  // 5. Moderar a un subordinado (debe permitir si el bot también está por encima)
  assert.equal(canModerateTarget(moderator, targetSubordinate).canModerate, true);

  // 6. Si el objetivo tiene rol superior al del bot (posición 55 vs bot 50), debe fallar
  const targetAboveBot = createMember("super-user", 55);
  const ownerMod = createMember("owner-1", 99);
  assert.equal(canModerateTarget(ownerMod, targetAboveBot).canModerate, false);

  // 7. Dueño del servidor puede moderar a cualquiera que esté por debajo del bot
  assert.equal(canModerateTarget(ownerMod, targetSuperior).canModerate, true);
});

test("CMD-02: canManageRole valida jerarquía de roles para moderadores y bot", () => {
  const guild = {
    ownerId: "owner-1",
    members: {
      me: { roles: { highest: { position: 50 } } },
    },
  };

  const modMember = {
    id: "mod-1",
    guild,
    roles: { highest: { position: 40 } },
  };

  const ownerMember = {
    id: "owner-1",
    guild,
    roles: { highest: { position: 99 } },
  };

  const lowRole = { id: "r1", position: 20 };
  const highRole = { id: "r2", position: 45 };
  const roleAboveBot = { id: "r3", position: 55 };

  assert.equal(canManageRole(modMember, lowRole).ok, true);
  assert.equal(canManageRole(modMember, highRole).ok, false);
  assert.equal(canManageRole(ownerMember, highRole).ok, true);
  assert.equal(canManageRole(ownerMember, roleAboveBot).ok, false);
});
