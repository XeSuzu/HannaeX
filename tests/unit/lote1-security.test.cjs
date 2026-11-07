const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

test("LOTE 1: HoshikoLogger buildInteractiveRow no incluye botón huérfano de Sentinel", () => {
  const { HoshikoLogger } = require(path.join(distDir, "Security/Logger/HoshikoLogger.js"));
  
  // buildInteractiveRow es un método privado en TS, invocable en JS
  const target = { id: "target-123", tag: "Target#0001", bot: false };
  const row = HoshikoLogger.buildInteractiveRow("AUTOMOD", target);

  assert.ok(row, "Debe retornar ActionRowBuilder");
  const buttonIds = row.components.map((c) => c.data.custom_id);
  assert.equal(buttonIds.includes(`modlog_act:sentinel:${target.id}`), false, "Sentinel no debe estar en los botones");
  assert.ok(buttonIds.includes(`modlog_act:timeout:${target.id}`));
  assert.ok(buttonIds.includes(`modlog_act:ban:${target.id}`));
  assert.ok(buttonIds.includes(`modlog_act:purge:${target.id}`));
  assert.ok(buttonIds.includes(`modlog_act:forgive:${target.id}`));
  assert.equal(row.components.length, 4, "Debe tener exactamente 4 botones de acción");
});

test("LOTE 1: components handleComponents rechaza mod_review:mute sin permiso ModerateMembers o jerarquía", async () => {
  const { handleComponents } = require(path.join(distDir, "Events/Client/handlers/components.js"));
  const { PermissionFlagsBits } = require("discord.js");

  let replyContent = "";
  let deferred = false;

  const interactionNoPerm = {
    isButton: () => true,
    customId: "mod_review:mute:target-123:msg-123",
    guild: {
      ownerId: "owner-1",
      client: { user: { id: "bot-1" } },
      members: {
        fetch: async () => ({
          id: "target-123",
          roles: { highest: { position: 10 } },
          moderatable: true,
        }),
      },
    },
    memberPermissions: {
      has: (perm) => {
        // Solo tiene ManageMessages, no ModerateMembers
        return perm === PermissionFlagsBits.ManageMessages;
      },
    },
    reply: async (opts) => {
      replyContent = opts.content;
    },
    deferUpdate: async () => {
      deferred = true;
    },
  };

  await handleComponents(interactionNoPerm, { user: { id: "bot-1" } });
  assert.equal(deferred, false, "No debe deferirse si falta permiso");
  assert.ok(replyContent.includes("Moderar Miembros"), "Debe exigir permiso de Moderar Miembros");
});

test("LOTE 1: components handleComponents rechaza modlog_act sobre owner, bot o self", async () => {
  const { handleComponents } = require(path.join(distDir, "Events/Client/handlers/components.js"));
  const { PermissionFlagsBits } = require("discord.js");

  let replyContent = "";

  const createInteraction = (targetId, action = "timeout") => ({
    isButton: () => true,
    customId: `modlog_act:${action}:${targetId}`,
    user: { id: "mod-123" },
    guild: {
      ownerId: "owner-1",
      client: { user: { id: "bot-1" } },
    },
    memberPermissions: {
      has: () => true,
    },
    reply: async (opts) => {
      replyContent = opts.content;
    },
    deferUpdate: async () => {},
  });

  // Target Owner
  await handleComponents(createInteraction("owner-1"), { user: { id: "bot-1" } });
  assert.ok(replyContent.includes("dueño del servidor"));

  // Target Bot
  await handleComponents(createInteraction("bot-1"), { user: { id: "bot-1" } });
  assert.ok(replyContent.includes("sobre mí"));

  // Target Self
  await handleComponents(createInteraction("mod-123"), { user: { id: "bot-1" } });
  assert.ok(replyContent.includes("sobre ti mismo"));
});

test("LOTE 1: components handleComponents modlog_act:sentinel responde mensaje explicativo seguro", async () => {
  const { handleComponents } = require(path.join(distDir, "Events/Client/handlers/components.js"));

  let replyContent = "";
  const interaction = {
    isButton: () => true,
    customId: "modlog_act:sentinel:user-1",
    user: { id: "mod-1" },
    guild: { ownerId: "owner-1" },
    memberPermissions: { has: () => true },
    reply: async (opts) => {
      replyContent = opts.content;
    },
  };

  await handleComponents(interaction, { user: { id: "bot-1" } });
  assert.ok(replyContent.includes("Hoshiko Security"));
});

test("LOTE 1: massban omite y reporta fallo si el objetivo es self, owner, bot o rango superior", async () => {
  const massbanMod = require(path.join(distDir, "Commands/SlashCmds/Moderation/mass-ban.js"));
  const massban = massbanMod.default || massbanMod;
  const { PermissionFlagsBits } = require("discord.js");

  const guild = {
    ownerId: "999999999999999999",
    bans: {
      create: async () => {},
    },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 50 } },
      },
      fetch: async (id) => {
        if (id === "888888888888888888") {
          // Superior member
          return {
            id,
            guild,
            roles: { highest: { position: 60 } },
          };
        }
        return null;
      },
    },
  };

  let finalEmbed = null;

  const interaction = {
    inGuild: () => true,
    guild,
    user: {
      id: "111111111111111111",
      username: "ModUser",
      displayAvatarURL: () => "https://example.com/avatar.png",
    },
    client: { user: { id: "222222222222222222" } },
    member: {
      id: "111111111111111111",
      guild,
      roles: { highest: { position: 40 } },
    },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.BanMembers,
    },
    options: {
      getString: (name) => {
        if (name === "usuarios") {
          return "111111111111111111 999999999999999999 222222222222222222 888888888888888888";
        }
        return "Razón test";
      },
    },
    editReply: async (opts) => ({
      ...opts,
      edit: async (finalOpts) => {
        finalEmbed = finalOpts.embeds?.[0]?.data;
        return finalOpts;
      },
    }),
  };

  await massban.execute(interaction, interaction.client);
  assert.ok(finalEmbed, "Debe editar loadingMsg con un embed");
  assert.ok(finalEmbed.description.includes("4 de 4 fallaron"), "Los 4 objetivos inválidos deben fallar");
});

