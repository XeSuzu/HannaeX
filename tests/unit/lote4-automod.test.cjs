const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const { normalizeText, checkBannedWords, handleWordFilter } = require(path.join(distDir, "Features/automod/wordFilter.js"));
const { handleLinkProtection } = require(path.join(distDir, "Features/linkProtector.js"));
const warningModel = require(path.join(distDir, "Database/moderation/warning.model.js"));
const messageUpdate = require(path.join(distDir, "Events/Client/Guilds/messageUpdate.js")).default;
const { generateSetupUI } = require(path.join(distDir, "Commands/SlashCmds/Moderation/setupUtils/ui.js"));
const { HoshikoLogger } = require(path.join(distDir, "Security/Logger/HoshikoLogger.js"));
const { SettingsManager } = require(path.join(distDir, "Database/guild/SettingsManager.js"));
const { IAConfigManager } = require(path.join(distDir, "Database/ai/IAConfigManager.js"));
const { PremiumManager } = require(path.join(distDir, "Database/guild/PremiumManager.js"));

test("LOTE 4: Detección de homóglifos cirílicos y griegos en checkBannedWords", () => {
  const banned = ["spam", "idiota", "troll"];

  // Cirílico: 'ѕ' (U+0455), 'р' (U+0440), 'а' (U+0430) -> "spam"
  const cyrillicSpam = "este usuario manda ѕраm por privado";
  const resSpam = checkBannedWords(cyrillicSpam, banned);
  assert.strictEqual(resSpam.hit, true, "Debe detectar 'spam' escrito con homóglifos cirílicos");
  assert.strictEqual(resSpam.word, "spam");

  // Cirílico: 'і' (U+0456), 'о' (U+043E), 'а' (U+0430) -> "idiota"
  const cyrillicIdiota = "menudo іdіоtа tenemos aqui";
  const resIdiota = checkBannedWords(cyrillicIdiota, banned);
  assert.strictEqual(resIdiota.hit, true, "Debe detectar 'idiota' con homóglifos cirílicos");
  assert.strictEqual(resIdiota.word, "idiota");

  // Griego: 'ο' (U+03BF), 'ρ' (U+03C1) -> "troll"
  const greekTroll = "eres un trοll molesto";
  const resTroll = checkBannedWords(greekTroll, banned);
  assert.strictEqual(resTroll.hit, true, "Debe detectar palabras con homóglifos griegos");
});

test("LOTE 4: Ausencia de falsos positivos ('as usual' / 'un as bajo la manga') y soporte morfológico", () => {
  const banned = ["ass", "idiota"];

  // Casos legítimos cotidianos que no deben disparar falso positivo
  assert.strictEqual(
    checkBannedWords("He is as usual late today", banned).hit,
    false,
    "'as usual' no debe disparar alerta para 'ass'"
  );

  assert.strictEqual(
    checkBannedWords("Tiene un as bajo la manga en esta partida", banned).hit,
    false,
    "'un as' no debe disparar alerta para 'ass'"
  );

  assert.strictEqual(
    checkBannedWords("as is the policy of the server", banned).hit,
    false,
    "'as is' no debe disparar alerta para 'ass'"
  );

  // Casos donde sí debe haber coincidencia legítima con "ass"
  assert.strictEqual(
    checkBannedWords("you are a real ass", banned).hit,
    true,
    "'ass' directo debe ser detectado"
  );

  assert.strictEqual(
    checkBannedWords("what an assssss", banned).hit,
    true,
    "'assssss' elongado debe ser detectado"
  );

  // Flexibilidad morfológica: sufijo "hole" en "asshole", plural "s" en "idiotas"
  const resAsshole = checkBannedWords("shut up asshole", banned);
  assert.strictEqual(resAsshole.hit, true, "Debe detectar 'asshole' como flexión morfológica de 'ass'");

  const resIdiotas = checkBannedWords("todos son unos idiotas", banned);
  assert.strictEqual(resIdiotas.hit, true, "Debe detectar plural 'idiotas' como flexión de 'idiota'");
});

test("LOTE 4: Validación de ObjectId en warning.model.ts (deleteWarning)", async () => {
  // 1. Con un ObjectId inválido (ej: texto arbitrario), debe retornar null de forma segura sin arrojar CastError
  const invalidResult1 = await warningModel.deleteWarning("guild-123", "invalid-id-12345");
  assert.strictEqual(invalidResult1, null, "ObjectId inválido debe retornar null");

  const invalidResult2 = await warningModel.deleteWarning("guild-123", "abc");
  assert.strictEqual(invalidResult2, null, "String corto no válido como ObjectId debe retornar null");

  const invalidResult3 = await warningModel.deleteWarning("guild-123", "");
  assert.strictEqual(invalidResult3, null, "String vacío debe retornar null");

  // 2. Con un ObjectId sintácticamente válido (24 caracteres hexadecimales), debe consultar Mongoose
  const originalDeleteOne = warningModel.Warning.deleteOne;
  try {
    warningModel.Warning.deleteOne = async (filter) => {
      assert.strictEqual(filter._id, "507f1f77bcf86cd799439011");
      assert.strictEqual(filter.guildId, "guild-valid");
      return { deletedCount: 1 };
    };

    const validResult = await warningModel.deleteWarning("guild-valid", "507f1f77bcf86cd799439011");
    assert.strictEqual(validResult, true, "ObjectId válido existente debe retornar true");
  } finally {
    warningModel.Warning.deleteOne = originalDeleteOne;
  }
});

test("LOTE 4: messageUpdate re-evalúa preventivemente filtros de AutoMod (WordFilter y LinkProtection)", async () => {
  let messagelogCalled = false;
  let wordFilterChecked = false;
  let linkProtectionChecked = false;

  const originalSendToChannel = HoshikoLogger.sendToChannel;
  HoshikoLogger.sendToChannel = async (guild, channelKey, embed) => {
    if (channelKey === "messagelog") messagelogCalled = true;
  };

  const originalGetLite = SettingsManager.getLite;
  const originalGetSettings = SettingsManager.getSettings;
  const mockConfig = {
    securityModules: { securityLevel: 2, wordFilter: true, antiLinks: true },
    bannedWords: ["prohibido"],
    allowedLinks: ["youtube.com"],
  };
  SettingsManager.getLite = async () => mockConfig;
  SettingsManager.getSettings = async () => mockConfig;

  try {
    // 1. Mensaje de bot: debe ignorarse inmediatamente
    messagelogCalled = false;
    await messageUpdate.execute(
      { content: "hola" },
      { content: "hola editado", author: { bot: true }, guild: { id: "g1" } }
    );
    assert.strictEqual(messagelogCalled, false, "Mensajes de bot no deben procesarse");

    // 2. Mensaje sin cambios: debe ignorarse
    messagelogCalled = false;
    await messageUpdate.execute(
      { content: "mismo texto" },
      { content: "mismo texto", author: { bot: false }, guild: { id: "g1" } }
    );
    assert.strictEqual(messagelogCalled, false, "Mensajes sin cambios en contenido deben ignorarse");

    // 3. Mensaje editado legítimo: envía a messagelog y pasa filtros
    let deleted = false;
    const mockChannel = {
      id: "ch-1",
      send: async () => ({ delete: async () => null }),
      isTextBased: () => true,
    };
    const mockGuild = { id: "g1", channels: { cache: new Map() } };
    const mockMember = { permissions: { has: () => false }, roles: { cache: new Map() } };

    const oldMsg = { content: "hola amigos" };
    const newMsgBanned = {
      id: "msg-1",
      content: "hola esto es prohibido ahora",
      author: { bot: false, id: "u1", tag: "user#0001", displayAvatarURL: () => "https://avatar" },
      guild: mockGuild,
      channel: mockChannel,
      member: mockMember,
      partial: false,
      delete: async () => { deleted = true; },
    };

    messagelogCalled = false;
    await messageUpdate.execute(oldMsg, newMsgBanned);
    assert.strictEqual(messagelogCalled, true, "Debe registrarse en messagelog");
    assert.strictEqual(deleted, true, "El mensaje editado con palabra prohibida debe ser eliminado");

    // 4. Mensaje editado con link sospechoso/no permitido
    let linkDeleted = false;
    const newMsgLink = {
      id: "msg-2",
      content: "mira este sitio http://sitio-malicioso-random.xyz/phish",
      author: { bot: false, id: "u2", tag: "user#0002", displayAvatarURL: () => "https://avatar" },
      guild: mockGuild,
      channel: mockChannel,
      member: mockMember,
      partial: false,
      delete: async () => { linkDeleted = true; },
    };

    await messageUpdate.execute(oldMsg, newMsgLink);
    assert.strictEqual(linkDeleted, true, "El mensaje editado con link no permitido debe ser eliminado");
  } finally {
    HoshikoLogger.sendToChannel = originalSendToChannel;
    SettingsManager.getLite = originalGetLite;
    SettingsManager.getSettings = originalGetSettings;
  }
});

test("LOTE 4: /setup y setupUtils/ui exponen únicamente los 4 módulos de AutoMod de Hoshiko", async () => {
  const originalGetSettings = SettingsManager.getSettings;
  const originalGetConfig = IAConfigManager.getConfig;
  const originalIsPremium = PremiumManager.isPremium;

  SettingsManager.getSettings = async () => ({
    securityModules: {
      securityLevel: 2,
      antiSpam: true,
      antiLinks: false,
      wordFilter: true,
      aiModeration: false,
    },
    modLogChannel: "1234567890",
  });

  IAConfigManager.getConfig = async () => ({
    aiSystem: { mode: "neko", behavior: "normal", spontaneousChannels: [] },
  });

  PremiumManager.isPremium = async () => false;

  try {
    const mockUser = { displayAvatarURL: () => "https://avatar" };

    // 1. Vista 'security'
    const secUI = await generateSetupUI("guild-test", "channel-test", mockUser, mockUser, "security");
    assert.ok(secUI.components && secUI.components.length >= 2, "La vista security debe contener filas de componentes");

    // Fila de interruptores de módulos
    const toggleRow = secUI.components[1];
    const buttons = toggleRow.components;
    assert.strictEqual(buttons.length, 4, "Debe exponer exactamente 4 módulos en los interruptores");

    const customIds = buttons.map((b) => b.data.custom_id);
    assert.deepStrictEqual(
      customIds,
      ["sec_antiSpam", "sec_antiLinks", "sec_wordFilter", "sec_aiModeration"],
      "Los módulos expuestos deben ser exactamente antiSpam, antiLinks, wordFilter y aiModeration"
    );

    // Confirmar que no existen customIds residuales de Security bot
    assert.strictEqual(customIds.includes("sec_antiRaid"), false, "No debe existir toggle de antiRaid");
    assert.strictEqual(customIds.includes("sec_antiNuke"), false, "No debe existir toggle de antiNuke");
    assert.strictEqual(customIds.includes("sec_antiAlt"), false, "No debe existir toggle de antiAlt");

    // 2. Vista 'main'
    const mainUI = await generateSetupUI("guild-test", "channel-test", mockUser, mockUser, "main");
    const mainEmbed = mainUI.embeds[0];
    const securityField = mainEmbed.data.fields.find((f) => f.name.includes("Seguridad"));
    assert.ok(securityField, "Debe existir campo de Seguridad en vista main");

    // En los módulos activos no deben aparecer Raid, Nuke ni Alt
    const secVal = securityField.value;
    assert.strictEqual(secVal.includes("Raid"), false, "No debe listar Raid en módulos de Hoshiko");
    assert.strictEqual(secVal.includes("Nuke"), false, "No debe listar Nuke en módulos de Hoshiko");
    assert.strictEqual(secVal.includes("Alt"), false, "No debe listar Alt en módulos de Hoshiko");
    assert.ok(secVal.includes("Spam") && secVal.includes("Palabras"), "Debe listar módulos legítimos activos");
  } finally {
    SettingsManager.getSettings = originalGetSettings;
    IAConfigManager.getConfig = originalGetConfig;
    PremiumManager.isPremium = originalIsPremium;
  }
});
