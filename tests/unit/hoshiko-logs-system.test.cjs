const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { Collection, OverwriteType, PermissionFlagsBits } = require("discord.js");

const distDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const {
  HoshikoLogger,
  PREMIUM_LOG_CHANNELS,
  resolveLogChannel,
  sanitizeUrlForLog,
} = require(path.join(distDir, "Security/Logger/HoshikoLogger.js"));
const { SettingsManager } = require(path.join(
  distDir,
  "Database/guild/SettingsManager.js",
));
const { PremiumManager } = require(path.join(
  distDir,
  "Database/guild/PremiumManager.js",
));
const { executeAiModerationDecision } = require(path.join(
  distDir,
  "Features/automod/aiJudge.js",
));
const { evaluateHighStressMessage } = require(path.join(
  distDir,
  "Features/automod/aiModeration.js",
));
const { markUserSafe } = require(path.join(
  distDir,
  "Features/automod/automodState.js",
));
const { handleLinkProtection, isKnownPhishingLink } = require(path.join(
  distDir,
  "Features/linkProtector.js",
));
const messageDeleteEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/messageDelete.js",
)).default;
const messageUpdateEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/messageUpdate.js",
)).default;
const voicelogEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/voicelog.js",
)).default;
const guildBanAddEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/guildBanAdd.js",
)).default;
const guildMemberRemoveEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/guildMemberRemove.js",
)).default;
const channelCreateEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/serverlog/channelCreate.js",
)).default;
const channelUpdateEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/serverlog/channelUpdate.js",
)).default;
const roleUpdateEvent = require(path.join(
  distDir,
  "Events/Client/Guilds/serverlog/roleUpdate.js",
)).default;
const setupLogsModule = require(path.join(
  distDir,
  "Commands/SlashCmds/Moderation/setup-logs.js",
));
const interactionCreateEvent = require(path.join(
  distDir,
  "Events/Client/interactionCreate.js",
)).default;

test("HOSHIKO LOGS §3 & §8: Los 6 canales principales están definidos y messagelog/voicelog no están bloqueados por Premium", async () => {
  assert.equal(setupLogsModule.LOGS_CATEGORY_NAME, "🔒 HOSHIKO LOGS");
  assert.equal(setupLogsModule.CORE_LOG_CHANNELS.length, 6);

  const keys = setupLogsModule.CORE_LOG_CHANNELS.map((c) => c.key);
  assert.deepEqual(keys, [
    "modlog",
    "messagelog",
    "messagereview",
    "linkslog",
    "voicelog",
    "serverlog",
  ]);

  assert.equal(
    PREMIUM_LOG_CHANNELS.has("messagelog"),
    false,
    "messagelog debe estar disponible en servidores estándar",
  );
  assert.equal(
    PREMIUM_LOG_CHANNELS.has("voicelog"),
    false,
    "voicelog debe estar disponible en servidores estándar",
  );
});

test("HOSHIKO LOGS: resolveLogChannel enruta a cada canal específico y aplica fallback limpio a modlog/all", () => {
  const fullConfig = {
    logChannels: {
      modlog: "ch-mod",
      messagelog: "ch-msg",
      messagereview: "ch-rev",
      linkslog: "ch-links",
      voicelog: "ch-voice",
      serverlog: "ch-srv",
      all: "ch-all",
    },
  };

  assert.equal(resolveLogChannel(fullConfig, "modlog"), "ch-mod");
  assert.equal(resolveLogChannel(fullConfig, "messagelog"), "ch-msg");
  assert.equal(resolveLogChannel(fullConfig, "messagereview"), "ch-rev");
  assert.equal(resolveLogChannel(fullConfig, "linkslog"), "ch-links");
  assert.equal(resolveLogChannel(fullConfig, "voicelog"), "ch-voice");
  assert.equal(resolveLogChannel(fullConfig, "serverlog"), "ch-srv");

  // Fallback de messagereview y linkslog hacia modlog si aún no tienen canal propio
  const legacyConfig = {
    logChannels: {
      modlog: "ch-mod-legacy",
      all: "ch-all-legacy",
    },
  };
  assert.equal(resolveLogChannel(legacyConfig, "messagereview"), "ch-mod-legacy");
  assert.equal(resolveLogChannel(legacyConfig, "linkslog"), "ch-mod-legacy");
  assert.equal(resolveLogChannel(legacyConfig, "voicelog"), "ch-all-legacy");
});

test("HOSHIKO LOGS §3.1 & §4.5: HoshikoLogger.logAction genera embed estructurado con Caso, Resultado, Origen, Duración y Responsable", async () => {
  let sentPayload = null;
  const mockChannel = {
    id: "ch-modlog",
    isTextBased: () => true,
    send: async (payload) => {
      sentPayload = payload;
      return {};
    },
  };

  const mockGuild = {
    id: "guild-log-1",
    name: "Test Server",
    iconURL: () => null,
    channels: {
      cache: new Map([["ch-modlog", mockChannel]]),
    },
  };

  const origGetSettings = SettingsManager.getSettings;
  SettingsManager.getSettings = async () => ({
    logChannels: { modlog: "ch-modlog" },
  });

  try {
    await HoshikoLogger.logAction(mockGuild, "MUTE", {
      user: {
        id: "user-123",
        tag: "User#0001",
        bot: false,
        displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png",
      },
      moderator: {
        id: "mod-456",
        tag: "Mod#0001",
        bot: false,
      },
      reason: "Spam reiterado",
      duration: "30m",
      caseId: 42,
      source: "Comando",
    });

    assert.ok(sentPayload, "Debe enviar el embed con componentes al canal #mod-log");
    const embedJson = sentPayload.embeds[0].toJSON();
    assert.equal(embedJson.title, "🔇 Usuario silenciado");
    assert.equal(embedJson.footer.text, "Hoshiko Moderation");

    const fieldsByName = Object.fromEntries(
      embedJson.fields.map((f) => [f.name, f.value]),
    );
    assert.match(fieldsByName["Usuario"], /<@user-123>/);
    assert.equal(fieldsByName["Acción"], "Silencio temporal");
    assert.equal(fieldsByName["Duración"], "30m");
    assert.match(fieldsByName["Responsable"], /<@mod-456>/);
    assert.equal(fieldsByName["Motivo"], "Spam reiterado");
    assert.equal(fieldsByName["Caso"], "#42");
    assert.equal(fieldsByName["Resultado"], "Ejecutado correctamente");
    assert.equal(fieldsByName["Origen"], "Comando");
  } finally {
    SettingsManager.getSettings = origGetSettings;
  }
});

test("HOSHIKO LOGS §3.4 & §12: sanitizeUrlForLog y handleLinkProtection neutralizan enlaces y enrutan a #links-logs", async () => {
  const safe = sanitizeUrlForLog("https://discord.gg/estafa-nitro\n`inyeccion`");
  assert.ok(safe.startsWith("hxxps://"), "Debe neutralizar el esquema https://");
  assert.ok(safe.includes("discord[.]gg/"), "Debe neutralizar invitaciones");
  assert.ok(!safe.includes("`"), "No debe contener backticks");

  let routedChannelKey = null;
  let capturedEmbed = null;

  const origSendToChannel = HoshikoLogger.sendToChannel;
  const origGetSettings = SettingsManager.getSettings;
  SettingsManager.getSettings = async () => ({
    securityModules: { securityLevel: 2, antiLinks: true },
    allowedLinks: [],
  });
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    routedChannelKey = channelKey;
    capturedEmbed = embed.toJSON();
  };

  try {
    let messageDeleted = false;
    const mockMessage = {
      id: "msg-link-1",
      channelId: "ch-general",
      content: "Entra aquí https://free-discord-nitro.ru/claim",
      author: {
        id: "spammer-1",
        username: "Spammer",
        tag: "Spammer#0001",
        bot: false,
        displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png",
      },
      guild: { id: "g-links" },
      member: {
        permissions: { has: () => false },
      },
      channel: {
        id: "ch-general",
        isTextBased: () => true,
        send: async () => ({ id: "warn-msg", delete: async () => {} }),
      },
      delete: async () => {
        messageDeleted = true;
      },
    };

    const hit = await handleLinkProtection(mockMessage, {
      securityModules: { antiLinks: true },
      allowedLinks: [],
    });

    assert.equal(hit, true);
    assert.equal(messageDeleted, true);
    assert.equal(routedChannelKey, "linkslog", "Debe enviar el log a linkslog (#links-logs)");
    assert.equal(capturedEmbed.title, "🔗 Enlace detectado");
    assert.equal(capturedEmbed.footer.text, "Hoshiko Logs • #links-logs");

    const linkField = capturedEmbed.fields.find(
      (f) => f.name === "Enlace (representación segura)",
    );
    assert.ok(linkField);
    assert.ok(
      linkField.value.includes("hxxps://free-discord-nitro.ru/claim"),
      "El enlace debe estar neutralizado con hxxps://",
    );
    assert.ok(
      !linkField.value.includes("https://"),
      "No debe incluir un enlace clicable https://",
    );
    assert.equal(
      HoshikoLogger.wasRecentBotMessageDelete("msg-link-1"),
      true,
      "Debe marcar el mensaje como eliminado por el bot para evitar duplicado en #message-log",
    );
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
    SettingsManager.getSettings = origGetSettings;
  }
});

test("HOSHIKO LOGS §3.3: executeAiModerationDecision envía revisiones a #message-review separando detección de sanción", async () => {
  let routedChannelKey = null;
  let capturedEmbed = null;
  let capturedComponents = null;

  const origSendToChannel = HoshikoLogger.sendToChannel;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed, components) => {
    routedChannelKey = channelKey;
    capturedEmbed = embed.toJSON();
    capturedComponents = components;
  };

  try {
    const res = await executeAiModerationDecision({
      guild: { id: "g-ai", client: { user: { id: "bot-1" } } },
      message: {
        id: "msg-rev-99",
        channelId: "ch-chat",
        content: "Mensaje ambiguo que requiere revisión",
        author: { id: "u-rev-1", tag: "UserRev#0001" },
      },
      decision: {
        verdict: "RuleViolation",
        confidence: 0.78,
        reason: "Posible acoso sutil",
        rule_id: 2,
      },
      action: "review",
      aiMode: "enforce",
      isRaid: false,
    });

    assert.equal(res.executed, true);
    assert.equal(routedChannelKey, "messagereview", "Debe enviar a messagereview (#message-review)");
    assert.equal(capturedEmbed.title, "🔎 Mensaje en revisión");
    assert.equal(capturedEmbed.footer.text, "Hoshiko Logs • #message-review");

    const fieldsByName = Object.fromEntries(
      capturedEmbed.fields.map((f) => [f.name, f.value]),
    );
    assert.equal(
      fieldsByName["Resultado de la evaluación"],
      "Detección automática (sin sanción aplicada)",
    );
    assert.equal(fieldsByName["Estado"], "⏳ Pendiente de revisión humana");
    assert.equal(capturedComponents.length, 1);
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
  }
});

test("HOSHIKO LOGS §3.2, §4.3, §4.4 & Deduplicación: messageDelete y messageUpdate usan formato ANTES/DESPUÉS/CONTENIDO y evitan duplicados de AutoMod y Ban/Kick", async () => {
  const capturedMessageLogs = [];
  const origSendToChannel = HoshikoLogger.sendToChannel;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    if (channelKey === "messagelog") {
      capturedMessageLogs.push(embed.toJSON());
    }
  };

  const origFetchAudit = HoshikoLogger.fetchAuditExecutor;
  HoshikoLogger.fetchAuditExecutor = async () => null;

  const origGetLite = SettingsManager.getLite;
  SettingsManager.getLite = async () => ({
    securityModules: { snipe: false, wordFilter: false, antiLinks: false },
  });

  try {
    // 1. Mensaje eliminado por AutoMod: debe ser ignorado por messageDelete
    HoshikoLogger.markBotMessageDelete("msg-bot-del-1");
    await messageDeleteEvent.execute(
      {
        id: "msg-bot-del-1",
        channelId: "ch-1",
        content: "spam eliminado por automod",
        author: { id: "u1", tag: "User#0001", bot: false, displayAvatarURL: () => "https://avatar" },
        guild: { id: "g1" },
      },
      {},
    );
    assert.equal(
      capturedMessageLogs.length,
      0,
      "Un mensaje eliminado por AutoMod no debe duplicarse en #message-log",
    );

    // 2. Mensaje eliminado manualmente sin caché: debe indicar *No disponible en caché*
    await messageDeleteEvent.execute(
      {
        id: "msg-manual-del-2",
        channelId: "ch-1",
        content: undefined,
        author: { id: "u1", tag: "User#0001", bot: false, displayAvatarURL: () => "https://avatar" },
        guild: { id: "g1" },
      },
      {},
    );
    assert.equal(capturedMessageLogs.length, 1);
    assert.equal(capturedMessageLogs[0].title, "🗑️ Mensaje eliminado");
    const contentField = capturedMessageLogs[0].fields.find(
      (f) => f.name === "CONTENIDO",
    );
    assert.equal(contentField.value, "*No disponible en caché*");
    assert.equal(capturedMessageLogs[0].footer.text, "Hoshiko Logs");

    // 3. Mensaje editado: debe incluir ANTES y DESPUÉS
    await messageUpdateEvent.execute(
      { content: "Texto original" },
      {
        id: "msg-edit-3",
        content: "Texto corregido",
        partial: false,
        author: { id: "u1", tag: "User#0001", bot: false, displayAvatarURL: () => "https://avatar" },
        channel: { id: "ch-1" },
        guild: { id: "g1" },
      },
      {},
    );
    assert.equal(capturedMessageLogs.length, 2);
    assert.equal(capturedMessageLogs[1].title, "✏️ Mensaje editado");
    const beforeField = capturedMessageLogs[1].fields.find((f) => f.name === "ANTES");
    const afterField = capturedMessageLogs[1].fields.find((f) => f.name === "DESPUÉS");
    assert.equal(beforeField.value, "Texto original");
    assert.equal(afterField.value, "Texto corregido");

    // 4. Deduplicación de guildBanAdd y guildMemberRemove cuando Hoshiko ejecutó la sanción
    let duplicateBanLogged = false;
    const origLogAction = HoshikoLogger.logAction;
    HoshikoLogger.logAction = async () => {
      duplicateBanLogged = true;
    };

    HoshikoLogger.markBotModerationAction("g1", "BAN", "u-banned-by-bot");
    await guildBanAddEvent.execute({
      guild: {
        id: "g1",
        fetchAuditLogs: async () => ({
          entries: new Collection([
            [
              "1",
              {
                targetId: "u-banned-by-bot",
                createdTimestamp: Date.now(),
                executor: { id: "mod-human", bot: false },
              },
            ],
          ]),
        }),
      },
      user: { id: "u-banned-by-bot", tag: "Banned#0001" },
    });

    assert.equal(
      duplicateBanLogged,
      false,
      "guildBanAdd no debe emitir un segundo log si el ban fue ejecutado por Hoshiko",
    );
    HoshikoLogger.logAction = origLogAction;
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
    HoshikoLogger.fetchAuditExecutor = origFetchAudit;
    SettingsManager.getLite = origGetLite;
  }
});

test("HOSHIKO LOGS §3.5 & §3.6: #voice-log registra cámara/stream/mute y #server-logs reporta Actor no disponible y cambios de permisos", async () => {
  const voiceEmbeds = [];
  const serverEmbeds = [];

  const origSendToChannel = HoshikoLogger.sendToChannel;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    if (channelKey === "voicelog") voiceEmbeds.push(embed.toJSON());
    if (channelKey === "serverlog") serverEmbeds.push(embed.toJSON());
  };

  const origFetchAudit = HoshikoLogger.fetchAuditExecutor;
  HoshikoLogger.fetchAuditExecutor = async () => null;

  try {
    const memberMock = {
      id: "u-voice-1",
      user: {
        id: "u-voice-1",
        tag: "VoiceUser#0001",
        bot: false,
        displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png",
      },
    };
    const voiceCh = { id: "vc-1", name: "General Voz" };

    // Cámara encendida dentro del mismo canal de voz
    await voicelogEvent.execute(
      {
        member: memberMock,
        guild: { id: "g1" },
        channel: voiceCh,
        selfVideo: false,
      },
      {
        member: memberMock,
        guild: { id: "g1" },
        channel: voiceCh,
        selfVideo: true,
      },
      {},
    );

    assert.equal(voiceEmbeds.length, 1);
    assert.equal(voiceEmbeds[0].title, "📹 Cámara encendida");
    assert.equal(voiceEmbeds[0].footer.text, "Hoshiko Logs");

    // Creación de canal sin Audit Log disponible -> debe indicar "Actor no disponible"
    await channelCreateEvent.execute(
      {
        id: "ch-new-1",
        name: "general",
        type: 0,
        parent: { name: "Texto" },
        guild: { id: "g1" },
      },
      {},
    );

    assert.equal(serverEmbeds.length, 1);
    const respField = serverEmbeds[0].fields.find((f) => f.name === "Responsable");
    assert.equal(respField.value, "Actor no disponible");

    // Modificación de overwrites en un canal
    const oldOverwrites = new Collection();
    const newOverwrites = new Collection([
      [
        "role-mod-1",
        {
          id: "role-mod-1",
          type: OverwriteType.Role,
          allow: { bitfield: 1024n, missing: () => ["ViewChannel"] },
          deny: { bitfield: 0n, missing: () => [] },
        },
      ],
    ]);

    await channelUpdateEvent.execute(
      {
        id: "ch-upd-1",
        name: "logs",
        guild: { id: "g1" },
        permissionOverwrites: { cache: oldOverwrites },
      },
      {
        id: "ch-upd-1",
        name: "logs",
        guild: { id: "g1" },
        permissionOverwrites: { cache: newOverwrites },
      },
      {},
    );

    assert.equal(serverEmbeds.length, 2);
    assert.equal(serverEmbeds[1].title, "✏️ Canal modificado");
    const changesField = serverEmbeds[1].fields.find((f) => f.name === "Cambios");
    assert.ok(changesField.value.includes("Overwrite añadido"));
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
    HoshikoLogger.fetchAuditExecutor = origFetchAudit;
  }
});

test("HOSHIKO LOGS §6, §8 & InteractionCreate: buildChannelOverwrites deniega @everyone y interactionCreate deduplica por ID", async () => {
  const mockGuild = {
    id: "guild-everyone-id",
    client: { user: { id: "bot-id" } },
    members: {
      me: {
        id: "bot-id",
        permissions: {
          has: (bit) =>
            bit !== PermissionFlagsBits.ManageRoles &&
            bit !== PermissionFlagsBits.Administrator,
        },
      },
    },
    roles: {
      cache: new Map([["role-staff-1", { id: "role-staff-1" }]]),
    },
  };

  const permStatus = setupLogsModule.checkRequiredBotLogPermissions(mockGuild);
  assert.equal(permStatus.ok, true);
  assert.equal(permStatus.canManageRoles, false);

  const overwrites = setupLogsModule.buildChannelOverwrites(mockGuild, [
    "role-staff-1",
    "role-inexistente",
  ]);
  assert.equal(overwrites.length, 3, "Debe incluir @everyone, el bot y el rol válido");
  assert.deepEqual(overwrites[0].deny, [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
  ]);

  // Verificar deduplicación centralizada en interactionCreate para componentes
  let buttonCalls = 0;
  const mockButtonInteraction = {
    id: "ix-dedup-test-1",
    customId: "unknown_noop_btn",
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isContextMenuCommand: () => false,
    isButton: () => {
      buttonCalls++;
      return true;
    },
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
  };

  await interactionCreateEvent.execute(mockButtonInteraction, {});
  const firstRunCalls = buttonCalls;
  await interactionCreateEvent.execute(mockButtonInteraction, {});
  assert.equal(
    buttonCalls,
    firstRunCalls,
    "Una interacción con el mismo ID no debe procesarse dos veces en interactionCreate",
  );
});

test("AUTOMOD SUITE: LinkProtector detecta invitaciones sin http(s)://, dominios phishing heurísticos y respeta exenciones", async () => {
  // 1. Verificación directa de proveedor / heurística de phishing
  assert.equal(isKnownPhishingLink("https://discord-nitro.com/claim"), true);
  assert.equal(isKnownPhishingLink("https://free-discord-nitro.ru/gift"), true);
  assert.equal(isKnownPhishingLink("https://grabify.link/track123"), true);
  assert.equal(isKnownPhishingLink("https://discord.com/channels/1/2"), false);
  assert.equal(isKnownPhishingLink("https://steamcommunity.com/id/user"), false);

  let routedChannelKey = null;
  let capturedEmbed = null;
  const origSendToChannel = HoshikoLogger.sendToChannel;
  const origGetSettings = SettingsManager.getSettings;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    routedChannelKey = channelKey;
    capturedEmbed = embed.toJSON();
  };
  SettingsManager.getSettings = async () => ({
    securityModules: { securityLevel: 2 },
  });

  try {
    // 2. Invitación desnuda (sin https:// ni www.) debe ser detectada y enviada a #links-logs
    let deletedBareInvite = false;
    const bareInviteMsg = {
      id: "msg-bare-inv-1",
      content: "Únanse todos a discord.gg/servidor-spam-123 ya mismo",
      channelId: "ch-chat",
      guild: { id: "g-links", name: "TestGuild", ownerId: "owner-1" },
      author: { id: "u-inv-1", username: "Spammer", tag: "Spammer#0001" },
      member: {
        permissions: { has: () => false },
        roles: { cache: new Map() },
      },
      channel: {
        id: "ch-chat",
        isTextBased: () => true,
        send: async () => ({ id: "warn-1", delete: async () => {} }),
      },
      delete: async () => {
        deletedBareInvite = true;
      },
    };

    const hitInvite = await handleLinkProtection(bareInviteMsg, {
      securityModules: { antiLinks: true },
      allowedLinks: [],
      exemptChannels: [],
      exemptRoles: [],
    });

    assert.equal(hitInvite, true, "Debe detectar discord.gg/... aunque no lleve https://");
    assert.equal(deletedBareInvite, true);
    assert.equal(routedChannelKey, "linkslog");
    const ruleField = capturedEmbed.fields.find((f) => f.name === "Regla detectada");
    assert.equal(ruleField.value, "Invitación de Discord externa");

    // 3. Canal exento no debe ser bloqueado por antiLinks
    const hitExempt = await handleLinkProtection(bareInviteMsg, {
      securityModules: { antiLinks: true },
      allowedLinks: [],
      exemptChannels: ["ch-chat"],
      exemptRoles: [],
    });
    assert.equal(hitExempt, false, "Los canales exentos no deben bloquearse");
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
    SettingsManager.getSettings = origGetSettings;
  }
});

test("AUTOMOD SUITE: evaluateHighStressMessage respeta aiModeration ON/OFF, usa modo enforce por defecto y enruta a #message-review", async () => {
  const reviewEmbeds = [];
  const origSendToChannel = HoshikoLogger.sendToChannel;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    if (channelKey === "messagereview") {
      reviewEmbeds.push(embed.toJSON());
    }
  };

  try {
    const baseMsg = {
      id: "msg-ai-eval-1",
      channelId: "ch-general",
      content: "Deberías matate ahora mismo, nadie te quiere aquí",
      guild: {
        id: "g-ai-suite",
        ownerId: "owner-1",
        client: { user: { id: "bot-1" } },
      },
      author: {
        id: "u-toxic-1",
        username: "ToxicUser",
        tag: "ToxicUser#0001",
        bot: false,
        createdTimestamp: Date.now() - 86_400_000, // Cuenta nueva (1 día)
      },
      member: {
        joinedTimestamp: Date.now() - 3_600_000,
        permissions: { has: () => false },
        roles: { cache: new Map() },
      },
      attachments: new Collection(),
      channel: { id: "ch-general" },
    };

    // 1. Si aiModeration está en false, NO debe ejecutarse aunque sea cuenta nueva
    await evaluateHighStressMessage(baseMsg, 2, {
      securityModules: { aiModeration: false, securityLevel: 2 },
      rules: [],
    });
    assert.equal(
      reviewEmbeds.length,
      0,
      "No debe evaluar ni enviar a #message-review cuando aiModeration está desactivado",
    );

    // 2. Si aiModeration está en true, evalúa en modo enforce por defecto y envía a #message-review
    await evaluateHighStressMessage(baseMsg, 2, {
      securityModules: { aiModeration: true, securityLevel: 2 },
      rules: [{ id: 1, text: "Respeto mutuo; prohibido el acoso." }],
    });
    assert.equal(
      reviewEmbeds.length,
      1,
      "Con aiModeration activo debe enviar el mensaje tóxico a #message-review en modo enforce",
    );
    assert.equal(reviewEmbeds[0].title, "🔎 Mensaje en revisión");
    assert.equal(reviewEmbeds[0].footer.text, "Hoshiko Logs • #message-review");

    // 3. Si el moderador marca al usuario como seguro (Descartar), se omite en evaluaciones posteriores
    markUserSafe("g-ai-suite", "u-toxic-1");
    await evaluateHighStressMessage(
      { ...baseMsg, id: "msg-ai-eval-2" },
      2,
      {
        securityModules: { aiModeration: true, securityLevel: 2 },
        rules: [],
      },
    );
    assert.equal(
      reviewEmbeds.length,
      1,
      "Un usuario marcado como seguro por un moderador no debe volver a disparar revisión inmediata",
    );
  } finally {
    HoshikoLogger.sendToChannel = origSendToChannel;
  }
});
