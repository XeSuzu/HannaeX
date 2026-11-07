const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const warnCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/warn.js")).default;
const banCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/ban.js")).default;
const kickCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/kick.js")).default;
const softbanCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/softban.js")).default;
const tempbanCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/tempban.js")).default;
const muteCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/Mute.js")).default;
const tempmuteCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/tempmute.js")).default;
const unbanCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/unban.js")).default;
const unmuteCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/unmute.js")).default;
const warningsCmd = require(path.join(distDir, "Commands/SlashCmds/Moderation/warnings.js")).default;

const warningModel = require(path.join(distDir, "Database/moderation/warning.model.js"));
const tempModModel = require(path.join(distDir, "Database/moderation/tempModeration.model.js"));
const caseModel = require(path.join(distDir, "Database/moderation/case.model.js"));
const { AutomodManager } = require(path.join(distDir, "Features/AutomodManager.js"));
const { HoshikoLogger } = require(path.join(distDir, "Security/Logger/HoshikoLogger.js"));
const { TempModerationService } = require(path.join(distDir, "Services/TempModerationService.js"));
const { PermissionFlagsBits, GuildMember } = require("discord.js");

function createMockGuildMember(data) {
  const member = Object.create(GuildMember.prototype);
  for (const [key, val] of Object.entries(data)) {
    Object.defineProperty(member, key, {
      value: val,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  return member;
}

// Mock seguro de createCase para evitar buffer timeout de Mongoose sin DB conectada
if (caseModel && typeof caseModel.createCase === "function") {
  caseModel.createCase = async (data) => ({
    caseId: 1,
    ...data,
    createdAt: new Date(),
  });
}

test("LOTE 2: Comandos de moderación manual no contienen método muerto prefixRun", () => {
  const commands = [
    { name: "ban", cmd: banCmd },
    { name: "kick", cmd: kickCmd },
    { name: "mute", cmd: muteCmd },
    { name: "tempmute", cmd: tempmuteCmd },
    { name: "unban", cmd: unbanCmd },
    { name: "unmute", cmd: unmuteCmd },
    { name: "warn", cmd: warnCmd },
    { name: "warnings", cmd: warningsCmd },
  ];

  for (const { name, cmd } of commands) {
    assert.equal(
      typeof cmd.prefixRun,
      "undefined",
      `Comando ${name} no debe contener prefixRun`,
    );
  }
});

test("LOTE 2: /warn tiene límite maxLength de 512 en opción motivo", () => {
  const motivoOption = warnCmd.data.options.find((opt) => opt.name === "motivo");
  assert.ok(motivoOption, "Debe existir opción motivo");
  assert.equal(motivoOption.max_length, 512, "maxLength debe ser 512");
});

test("LOTE 2: /warn solo registra 1 advertencia limpia y no duplica vía AutomodManager", async () => {
  let addWarningCalls = 0;
  let loggedActionType = null;
  let editReplyCalls = 0;
  let followUpCalls = 0;

  const originalAddWarning = warningModel.addWarning;
  const originalGetWarnings = warningModel.getWarnings;
  const originalLogAction = HoshikoLogger.logAction;

  warningModel.addWarning = async (...args) => {
    addWarningCalls++;
    return { _id: "warn-id-1" };
  };

  warningModel.getWarnings = async () => [
    { _id: "warn-id-1", reason: "Test warn", moderatorId: "mod-1", createdAt: new Date() },
  ];

  HoshikoLogger.logAction = async (guild, actionType, payload) => {
    loggedActionType = actionType;
  };

  const guild = {
    id: "guild-1",
    name: "Guild 1",
    ownerId: "owner-1",
    client: { user: { id: "bot-1" } },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 50 } },
      },
    },
  };

  const targetMember = createMockGuildMember({
    id: "user-2",
    guild,
    user: {
      id: "user-2",
      tag: "Target#0002",
      send: async () => {},
      displayAvatarURL: () => "https://example.com/avatar.png",
    },
    roles: { highest: { position: 10 } },
    displayAvatarURL: () => "https://example.com/avatar.png",
  });

  const modMember = createMockGuildMember({
    id: "mod-1",
    guild,
    roles: { highest: { position: 30 } },
  });

  const interaction = {
    inGuild: () => true,
    guild,
    member: modMember,
    memberPermissions: {
      has: (perm) => perm === PermissionFlagsBits.ModerateMembers,
    },
    user: { id: "mod-1", tag: "Mod#0001" },
    options: {
      getMember: (name) => (name === "usuario" ? targetMember : null),
      getString: (name) => (name === "motivo" ? "Comportamiento inadecuado" : null),
    },
    editReply: async () => {
      editReplyCalls++;
    },
    followUp: async () => {
      followUpCalls++;
    },
  };

  try {
    await warnCmd.execute(interaction, interaction.guild.client);
    assert.equal(addWarningCalls, 1, "/warn debe registrar exactamente 1 advertencia");
    assert.equal(loggedActionType, "WARN", "Debe registrar log tipo WARN");
    assert.equal(editReplyCalls, 1, "Debe responder con editReply");
    assert.equal(followUpCalls, 0, "No debe usar followUp");
  } finally {
    warningModel.addWarning = originalAddWarning;
    warningModel.getWarnings = originalGetWarnings;
    HoshikoLogger.logAction = originalLogAction;
  }
});

test("LOTE 2: Fallos de guardia en comandos resuelven con editReply sin dejar deferral colgado", async () => {
  const commandsToTest = [
    { name: "ban", cmd: banCmd, perm: PermissionFlagsBits.BanMembers },
    { name: "kick", cmd: kickCmd, perm: PermissionFlagsBits.KickMembers },
    { name: "softban", cmd: softbanCmd, perm: PermissionFlagsBits.BanMembers },
    { name: "tempban", cmd: tempbanCmd, perm: PermissionFlagsBits.BanMembers },
    { name: "mute", cmd: muteCmd, perm: PermissionFlagsBits.ModerateMembers },
    { name: "tempmute", cmd: tempmuteCmd, perm: PermissionFlagsBits.ModerateMembers },
    { name: "warn", cmd: warnCmd, perm: PermissionFlagsBits.ModerateMembers },
    { name: "unban", cmd: unbanCmd, perm: PermissionFlagsBits.BanMembers },
    { name: "unmute", cmd: unmuteCmd, perm: PermissionFlagsBits.ModerateMembers },
  ];

  for (const { name, cmd, perm } of commandsToTest) {
    let editReplyMessage = null;
    let followUpCalls = 0;

    // Caso: Moderador sin permisos
    const interactionNoModPerm = {
      inGuild: () => true,
      guild: {
        id: "guild-1",
        ownerId: "owner-1",
        members: { me: { permissions: { has: () => true } } },
      },
      member: { id: "mod-without-perm" },
      memberPermissions: {
        has: () => false, // No tiene permisos
      },
      user: { id: "mod-without-perm" },
      options: {
        getMember: () => null,
        getString: () => "test",
        getBoolean: () => false,
      },
      editReply: async (payload) => {
        editReplyMessage = typeof payload === "string" ? payload : payload.content;
      },
      followUp: async () => {
        followUpCalls++;
      },
    };

    await cmd.execute(interactionNoModPerm, {});
    assert.equal(followUpCalls, 0, `${name}: No debe usar followUp cuando falla la guardia`);
    assert.ok(
      editReplyMessage && editReplyMessage.includes("permisos"),
      `${name}: Debe resolver deferral con editReply explicando falta de permisos (recibido: ${editReplyMessage})`,
    );
  }
});

test("LOTE 2: Mute y unmute no duplican envíos con channel.send tras editReply", async () => {
  let channelSendCalls = 0;
  let editReplyCalls = 0;

  const mockChannel = {
    isTextBased: () => true,
    send: async () => {
      channelSendCalls++;
    },
  };

  const guild = {
    id: "guild-1",
    ownerId: "owner-1",
    client: { user: { id: "bot-1" } },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 50 } },
      },
    },
  };

  const targetMember = createMockGuildMember({
    id: "user-target",
    guild,
    user: { id: "user-target", tag: "Target#0001", displayAvatarURL: () => "https://example.com/avatar.png" },
    roles: { highest: { position: 10 } },
    displayAvatarURL: () => "https://example.com/avatar.png",
    timeout: async () => {},
    communicationDisabledUntilTimestamp: Date.now() + 60000,
  });

  const modMember = createMockGuildMember({
    id: "mod-1",
    guild,
    roles: { highest: { position: 30 } },
  });

  const createInteraction = () => ({
    inGuild: () => true,
    channel: mockChannel,
    guild,
    member: modMember,
    memberPermissions: { has: () => true },
    user: { id: "mod-1", tag: "Mod#0001" },
    options: {
      getMember: () => targetMember,
      getString: (name) => {
        if (name === "tiempo") return "10m";
        if (name === "motivo") return "Spam";
        return null;
      },
    },
    editReply: async () => {
      editReplyCalls++;
    },
    followUp: async () => {},
  });

  const originalRecordAction = AutomodManager.recordManualAction;
  const originalLogAction = HoshikoLogger.logAction;
  const originalDeleteOne = tempModModel.TempModeration.deleteOne;
  AutomodManager.recordManualAction = async () => {};
  HoshikoLogger.logAction = async () => {};
  tempModModel.TempModeration.deleteOne = async () => ({ deletedCount: 1 });

  try {
    // Ejecutar Mute
    channelSendCalls = 0;
    editReplyCalls = 0;
    await muteCmd.execute(createInteraction(), {});
    assert.equal(editReplyCalls, 1, "Mute debe responder con editReply");
    assert.equal(channelSendCalls, 0, "Mute no debe enviar tarjeta duplicada al canal");

    // Ejecutar unmute
    channelSendCalls = 0;
    editReplyCalls = 0;
    await unmuteCmd.execute(createInteraction(), {});
    assert.equal(editReplyCalls, 1, "unmute debe responder con editReply");
    assert.equal(channelSendCalls, 0, "unmute no debe enviar tarjeta duplicada al canal");
  } finally {
    AutomodManager.recordManualAction = originalRecordAction;
    HoshikoLogger.logAction = originalLogAction;
    tempModModel.TempModeration.deleteOne = originalDeleteOne;
  }
});

test("LOTE 2: unban y unmute limpian TempModeration y registran UNBAN/UNMUTE en logger", async () => {
  let cleanedRecords = [];
  let loggedActions = [];

  const originalDeleteOne = tempModModel.TempModeration.deleteOne;
  const originalLogAction = HoshikoLogger.logAction;
  const originalRecordAction = AutomodManager.recordManualAction;

  tempModModel.TempModeration.deleteOne = async (query) => {
    cleanedRecords.push(query);
    return { deletedCount: 1 };
  };

  HoshikoLogger.logAction = async (guild, actionType, payload) => {
    loggedActions.push({ actionType, payload });
  };

  AutomodManager.recordManualAction = async () => {};

  const bannedUser = {
    id: "123456789012345678",
    tag: "Banned#0001",
    displayAvatarURL: () => "https://example.com/avatar.png",
  };

  const unbanInteraction = {
    inGuild: () => true,
    guild: {
      id: "guild-1",
      ownerId: "owner-1",
      client: { user: { id: "bot-1" } },
      members: {
        me: {
          permissions: { has: () => true },
          roles: { highest: { position: 50 } },
        },
      },
      bans: {
        fetch: async (id) => ({ user: bannedUser }),
        remove: async () => {},
      },
    },
    member: {
      id: "mod-1",
      roles: { highest: { position: 30 } },
    },
    memberPermissions: { has: () => true },
    user: { id: "mod-1", tag: "Mod#0001" },
    options: {
      getString: (name) => {
        if (name === "usuario") return "123456789012345678";
        if (name === "razon") return "Disculpa aceptada";
        return null;
      },
    },
    editReply: async () => {},
    followUp: async () => {},
  };

  const guild = {
    id: "guild-1",
    ownerId: "owner-1",
    client: { user: { id: "bot-1" } },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 50 } },
      },
    },
  };

  const mutedTarget = createMockGuildMember({
    id: "987654321098765432",
    guild,
    user: { id: "987654321098765432", tag: "Muted#0001", displayAvatarURL: () => "https://example.com/avatar.png" },
    roles: { highest: { position: 10 } },
    displayAvatarURL: () => "https://example.com/avatar.png",
    timeout: async () => {},
    communicationDisabledUntilTimestamp: Date.now() + 60000,
  });

  const unmuteInteraction = {
    inGuild: () => true,
    guild,
    member: createMockGuildMember({
      id: "mod-1",
      guild,
      roles: { highest: { position: 30 } },
    }),
    memberPermissions: { has: () => true },
    user: { id: "mod-1", tag: "Mod#0001" },
    options: {
      getMember: () => mutedTarget,
    },
    editReply: async () => {},
    followUp: async () => {},
  };

  try {
    // Probar unban
    await unbanCmd.execute(unbanInteraction, {});
    // Probar unmute
    await unmuteCmd.execute(unmuteInteraction, {});

    // Verificar limpieza de TempModeration
    const unbanCleaned = cleanedRecords.find(
      (r) => r.userId === "123456789012345678" && r.tipo === "ban",
    );
    assert.ok(unbanCleaned, "unban debe limpiar registro de TempModeration tipo ban");

    const unmuteCleaned = cleanedRecords.find(
      (r) => r.userId === "987654321098765432" && r.tipo === "mute",
    );
    assert.ok(unmuteCleaned, "unmute debe limpiar registro de TempModeration tipo mute");

    // Verificar tipo de logs
    const unbanLog = loggedActions.find((a) => a.actionType === "UNBAN");
    assert.ok(unbanLog, "unban debe registrar log con tipo 'UNBAN'");

    const unmuteLog = loggedActions.find((a) => a.actionType === "UNMUTE");
    assert.ok(unmuteLog, "unmute debe registrar log con tipo 'UNMUTE'");

    const unwarnLog = loggedActions.find((a) => a.actionType === "UNWARN");
    assert.equal(unwarnLog, undefined, "No debe haber registros con tipo 'UNWARN' erróneo");
  } finally {
    tempModModel.TempModeration.deleteOne = originalDeleteOne;
    HoshikoLogger.logAction = originalLogAction;
    AutomodManager.recordManualAction = originalRecordAction;
  }
});

test("LOTE 2: TempModerationService registra UNBAN y UNMUTE al expirar castigos", async () => {
  let loggedActions = [];
  const originalLogAction = HoshikoLogger.logAction;
  HoshikoLogger.logAction = async (guild, actionType, payload) => {
    loggedActions.push({ actionType, payload });
  };

  const clientMock = {
    user: { id: "bot-1" },
    guilds: {
      cache: new Map([
        [
          "guild-1",
          {
            id: "guild-1",
            bans: {
              fetch: async () => ({ user: { id: "user-ban-1", tag: "BannedUser#0001" } }),
              remove: async () => {},
            },
            members: {
              fetch: async () => ({
                user: { id: "user-mute-1", tag: "MutedUser#0001" },
                communicationDisabledUntilTimestamp: Date.now() + 100000,
                timeout: async () => {},
              }),
            },
          },
        ],
      ]),
    },
  };

  const recordBan = {
    guildId: "guild-1",
    userId: "user-ban-1",
    tipo: "ban",
    duration: "10m",
    deleteOne: async () => {},
  };

  const recordMute = {
    guildId: "guild-1",
    userId: "user-mute-1",
    tipo: "mute",
    duration: "10m",
    deleteOne: async () => {},
  };

  try {
    // Invocamos processRecord (privado en TS, accesible en JS)
    await TempModerationService.processRecord(clientMock, recordBan, new Date());
    await TempModerationService.processRecord(clientMock, recordMute, new Date());

    assert.ok(
      loggedActions.some((a) => a.actionType === "UNBAN"),
      "TempModerationService debe registrar UNBAN al expirar ban",
    );
    assert.ok(
      loggedActions.some((a) => a.actionType === "UNMUTE"),
      "TempModerationService debe registrar UNMUTE al expirar mute",
    );
    assert.equal(
      loggedActions.some((a) => a.actionType === "UNWARN"),
      false,
      "TempModerationService no debe registrar UNWARN para ban/mute expirados",
    );
  } finally {
    HoshikoLogger.logAction = originalLogAction;
  }
});
