const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const massban = require(path.join(
  distDir,
  "Commands/SlashCmds/Moderation/mass-ban.js",
)).default;
const unmuteCmd = require(path.join(
  distDir,
  "Commands/SlashCmds/Moderation/unmute.js",
)).default;
const {
  handleComponents,
  buttonActionLocks,
} = require(path.join(distDir, "Events/Client/handlers/components.js"));
const { PermissionFlagsBits, GuildMember } = require("discord.js");
const automodState = require(path.join(
  distDir,
  "Features/automod/automodState.js",
));
const { SettingsManager } = require(path.join(
  distDir,
  "Database/guild/SettingsManager.js",
));
const caseModel = require(path.join(
  distDir,
  "Database/moderation/case.model.js",
));

// Evitar bloqueos de Mongoose desconectado en pruebas unitarias
SettingsManager.getSettings = async () => ({
  securityModules: { securityLevel: 2 },
});
if (caseModel.GuildSequenceModel) {
  caseModel.GuildSequenceModel.findOneAndUpdate = async () => ({ seq: 1 });
}
if (caseModel.CaseModel) {
  caseModel.CaseModel.create = async (data) => ({
    ...data,
    caseId: 1,
    _id: "mock-case-id",
  });
}

test("AUD-02: mass-ban distingue error 10007 (usuario externo permitido) de error transitorio (abortado por seguridad)", async () => {
  const bannedIds = [];
  const guild = {
    ownerId: "owner-999",
    bans: {
      create: async (id) => {
        bannedIds.push(id);
      },
    },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 50 } },
      },
      fetch: async (id) => {
        if (id === "100070000000000000") {
          // Usuario no está en el servidor: DiscordAPIError 10007
          const err = new Error("Unknown Member");
          err.code = 10007;
          throw err;
        }
        if (id === "500000000000000000") {
          // Error transitorio de red / 500
          const err = new Error("Internal Server Error / Socket Timeout");
          err.code = 500;
          throw err;
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
      id: "mod-111",
      username: "ModUser",
      displayAvatarURL: () => "https://example.com/avatar.png",
    },
    client: { user: { id: "bot-222" } },
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 40 } },
    },
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.BanMembers,
    },
    options: {
      getString: (name) => {
        if (name === "usuarios") {
          return "100070000000000000 500000000000000000";
        }
        return "Razón test AUD-02";
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

  assert.ok(finalEmbed, "Debe editar el mensaje con el embed final");
  assert.equal(
    bannedIds.includes("100070000000000000"),
    true,
    "El usuario externo con error 10007 debe ser baneado exitosamente",
  );
  assert.equal(
    bannedIds.includes("500000000000000000"),
    false,
    "El usuario con error transitorio 500 NO debe ser baneado",
  );

  const errorField = finalEmbed.fields?.find((f) => f.name.includes("Errores"));
  assert.ok(
    errorField?.value?.includes("Fallo de verificación de jerarquía"),
    "Debe reportar fallo de verificación de jerarquía para el error transitorio",
  );
});

test("AUD-02: components modlog_act:ban aborta acción ante error transitorio de Discord", async () => {
  let banned = false;
  let followUpContent = "";

  const guild = {
    id: "guild-aud02",
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    members: {
      fetch: async () => {
        const err = new Error("ECONNRESET: Discord Gateway Timeout");
        err.code = "ECONNRESET";
        throw err;
      },
      ban: async () => {
        banned = true;
      },
    },
  };

  const interaction = {
    isButton: () => true,
    customId: "modlog_act:ban:user-transient-err",
    user: { id: "mod-111", tag: "Mod#0001" },
    guild,
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    reply: async () => {},
    deferUpdate: async () => {},
    followUp: async (opts) => {
      followUpContent = opts.content;
    },
  };

  await handleComponents(interaction, { user: { id: "bot-222" } });

  assert.equal(banned, false, "No debe ejecutar el ban ante error de red");
  assert.match(
    followUpContent,
    /error transitorio de Discord/i,
    "Debe advertir error transitorio",
  );
});

test("AUD-03: components modlog_act:forgive neutraliza enlaces y no persiste backdoor en whitelist", async () => {
  const sentMessages = [];
  const guildId = "guild-aud03";
  const targetId = "target-spammer-123";

  automodState.rememberDeletedMessage(
    guildId,
    targetId,
    "chan-1",
    "¡Gana Nitro gratis aquí! https://phishing-scam.xyz/malware.exe descarga ya @everyone",
  );

  const mockChannel = {
    isTextBased: () => true,
    send: async (msg) => {
      sentMessages.push(msg);
      return msg;
    },
  };

  const guild = {
    id: guildId,
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    channels: {
      cache: new Map([["chan-1", mockChannel]]),
    },
    members: {
      fetch: async () => ({
        id: targetId,
        guild: {
          id: guildId,
          ownerId: "owner-999",
          client: { user: { id: "bot-222" } },
        },
        roles: { highest: { position: 10 } },
        isCommunicationDisabled: () => false,
      }),
    },
  };

  const interaction = {
    isButton: () => true,
    customId: `modlog_act:forgive:${targetId}`,
    user: { id: "mod-111", tag: "Mod#0001" },
    guild,
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    message: {
      embeds: [],
      components: [],
    },
    reply: async () => {},
    deferUpdate: async () => {},
    editReply: async () => {},
    followUp: async () => {},
  };

  await handleComponents(interaction, { user: { id: "bot-222" } });

  assert.equal(
    automodState.isUserSafe(guildId, targetId),
    true,
    "El usuario debe ser marcado como seguro temporalmente en automodState",
  );
  assert.equal(
    sentMessages.length,
    1,
    "Debe enviar notificación de mensaje restaurado de forma segura",
  );
  const msgContent = sentMessages[0].content;
  assert.equal(
    msgContent.includes("https://phishing-scam.xyz"),
    false,
    "El enlace malicioso no debe aparecer en el mensaje enviado",
  );
  assert.ok(
    msgContent.includes("[enlace neutralizado]"),
    "Debe contener [enlace neutralizado]",
  );
  assert.deepEqual(
    sentMessages[0].allowedMentions,
    { parse: [] },
    "Debe deshabilitar menciones masivas",
  );
});

test("AUD-06: /unmute rechaza remover silencio si el objetivo tiene rol superior o igual al moderador", async () => {
  let timeoutCleared = false;
  let replyContent = "";

  const guild = {
    id: "guild-aud06",
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 100 } },
      },
    },
  };

  const superiorTarget = {
    id: "admin-superior",
    guild,
    user: { id: "admin-superior", tag: "SuperiorAdmin#0001" },
    roles: { highest: { position: 80 } },
    moderatable: false,
    communicationDisabledUntilTimestamp: Date.now() + 60000,
    timeout: async () => {
      timeoutCleared = true;
    },
  };
  Object.setPrototypeOf(superiorTarget, GuildMember.prototype);

  const interaction = {
    inGuild: () => true,
    guild,
    user: { id: "mod-111", tag: "Mod#0001" },
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    options: {
      getMember: () => superiorTarget,
    },
    editReply: async (opts) => {
      replyContent = opts.content;
    },
  };

  await unmuteCmd.execute(interaction, {});

  assert.equal(
    timeoutCleared,
    false,
    "No debe ejecutar target.timeout(null) sobre un rol superior",
  );
  assert.match(
    replyContent,
    /rol igual o superior|jerarqu[ií]a/i,
    "Debe responder con error de jerarquía",
  );
});

test("AUD-06: components modlog_act:unmute valida jerarquía estricta", async () => {
  let timeoutCleared = false;
  let followUpContent = "";

  const guild = {
    id: "guild-aud06-comp",
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    members: {
      fetch: async (id) => ({
        id,
        guild: {
          id: "guild-aud06-comp",
          ownerId: "owner-999",
          client: { user: { id: "bot-222" } },
        },
        roles: { highest: { position: 80 } },
        isCommunicationDisabled: () => true,
        moderatable: false,
        timeout: async () => {
          timeoutCleared = true;
        },
      }),
    },
  };

  const interaction = {
    isButton: () => true,
    customId: "modlog_act:unmute:admin-superior-comp",
    user: { id: "mod-111", tag: "Mod#0001" },
    guild,
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    message: {
      embeds: [],
      components: [],
    },
    reply: async () => {},
    deferUpdate: async () => {},
    followUp: async (opts) => {
      followUpContent = opts.content;
    },
  };

  await handleComponents(interaction, { user: { id: "bot-222" } });

  assert.equal(
    timeoutCleared,
    false,
    "No debe quitar el silencio a un usuario con jerarquía superior",
  );
  assert.match(
    followUpContent,
    /rol igual o superior|jerarqu[ií]a/i,
    "Debe advertir jerarquía insuficiente",
  );
});

test("AUD-07: Bloqueo de concurrencia y doble clic en botones de componentes", async () => {
  const guildId = "guild-aud07";
  const targetId = "target-dup-test";
  const action = "timeout";
  let firstExecuted = false;
  let duplicateBlocked = false;

  const guild = {
    id: guildId,
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    members: {
      fetch: async () => ({
        id: targetId,
        guild: {
          id: guildId,
          ownerId: "owner-999",
          client: { user: { id: "bot-222" } },
        },
        roles: { highest: { position: 10 } },
        moderatable: true,
        timeout: async () => {
          firstExecuted = true;
        },
      }),
    },
  };

  const createInteraction = () => ({
    isButton: () => true,
    customId: `modlog_act:${action}:${targetId}`,
    user: { id: "mod-111", tag: "Mod#0001" },
    guild,
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    message: { embeds: [], components: [] },
    reply: async (opts) => {
      if (
        opts.content.includes("ya está siendo procesada") ||
        opts.content.includes("otro moderador")
      ) {
        duplicateBlocked = true;
      }
    },
    deferUpdate: async () => {},
    editReply: async () => {},
    followUp: async () => {},
  });

  buttonActionLocks.delete(`lock:btn:${guildId}:${action}:${targetId}`);

  const interaction1 = createInteraction();
  const interaction2 = createInteraction();

  await Promise.all([
    handleComponents(interaction1, { user: { id: "bot-222" } }),
    handleComponents(interaction2, { user: { id: "bot-222" } }),
  ]);

  assert.ok(
    duplicateBlocked,
    "La segunda interacción concurrente debe ser bloqueada con mensaje informativo",
  );
});

test("AUD-08: components modlog_act:purge rechaza si el moderador carece de permisos en el canal destino", async () => {
  let bulkDeleteCalled = false;
  let followUpContent = "";
  const channelId = "987654321012345678";

  const mockChannel = {
    id: channelId,
    isTextBased: () => true,
    permissionsFor: () => ({
      has: (perm) => perm === PermissionFlagsBits.ViewChannel,
    }),
    messages: {
      fetch: async () => new Map(),
    },
    bulkDelete: async () => {
      bulkDeleteCalled = true;
    },
  };

  const guild = {
    id: "guild-aud08",
    ownerId: "owner-999",
    client: { user: { id: "bot-222" } },
    channels: {
      cache: new Map([[channelId, mockChannel]]),
      fetch: async () => mockChannel,
    },
    members: {
      fetch: async () => ({
        id: "target-purged-user",
        guild: {
          id: "guild-aud08",
          ownerId: "owner-999",
          client: { user: { id: "bot-222" } },
        },
        roles: { highest: { position: 10 } },
      }),
    },
  };

  const interaction = {
    isButton: () => true,
    customId: "modlog_act:purge:target-purged-user",
    user: { id: "mod-111", tag: "Mod#0001" },
    guild,
    member: {
      id: "mod-111",
      guild,
      roles: { highest: { position: 50 } },
    },
    memberPermissions: {
      has: () => true,
    },
    message: {
      components: [
        {
          components: [
            {
              url: `https://discord.com/channels/123/${channelId}/456`,
            },
          ],
        },
      ],
      embeds: [],
    },
    reply: async () => {},
    deferUpdate: async () => {},
    followUp: async (opts) => {
      followUpContent = opts.content;
    },
  };

  await handleComponents(interaction, { user: { id: "bot-222" } });

  assert.equal(
    bulkDeleteCalled,
    false,
    "No debe ejecutar bulkDelete si el moderador no tiene permisos en el canal",
  );
  assert.match(
    followUpContent,
    /Gestionar Mensajes|permisos suficientes/i,
    "Debe rechazar por falta de permisos en el canal",
  );
});
