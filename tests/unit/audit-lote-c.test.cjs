const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const distDir =
  process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { TempModerationService } = require(path.join(
  distDir,
  "Services/TempModerationService.js",
));
const tempModModel = require(path.join(
  distDir,
  "Database/moderation/tempModeration.model.js",
));
const { normalizeText, checkBannedWords } = require(path.join(
  distDir,
  "Features/automod/wordFilter.js",
));
const { isKnownPhishingLink } = require(path.join(
  distDir,
  "Features/linkProtector.js",
));
const automodState = require(path.join(
  distDir,
  "Features/automod/automodState.js",
));
const { sanitizeSecrets } = require(path.join(
  distDir,
  "Security/Logger/LocalStorage.js",
));
const { HoshikoLogger } = require(path.join(
  distDir,
  "Security/Logger/HoshikoLogger.js",
));
const { SettingsManager } = require(path.join(
  distDir,
  "Database/guild/SettingsManager.js",
));

SettingsManager.getSettings = async () => ({
  securityModules: { securityLevel: 2 },
});

test("AUD-04: TempModerationService elimina condicionalmente y no levanta sanciones si el registro fue renovado o modificado", async () => {
  let banRemoved = false;
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
          "guild-aud04",
          {
            id: "guild-aud04",
            bans: {
              fetch: async () => ({
                user: { id: "user-renewed", tag: "User#0001" },
              }),
              remove: async () => {
                banRemoved = true;
              },
            },
          },
        ],
      ]),
    },
  };

  const originalFindOneAndDelete = tempModModel.TempModeration.findOneAndDelete;

  try {
    // 1. Simular que el registro fue renovado en MongoDB (findOneAndDelete retorna null)
    tempModModel.TempModeration.findOneAndDelete = async () => null;

    const recordRenewed = {
      _id: "mongo-id-1",
      guildId: "guild-aud04",
      userId: "user-renewed",
      tipo: "ban",
      duration: "1d",
      expiresAt: new Date(Date.now() - 5000),
      status: "pending",
      deleteOne: async () => {},
    };

    await TempModerationService.processRecord(
      clientMock,
      recordRenewed,
      new Date(),
    );

    assert.equal(
      banRemoved,
      false,
      "No debe remover el ban en Discord si el registro no fue eliminado condicionalmente de la DB",
    );
    assert.equal(
      loggedActions.length,
      0,
      "No debe registrar log de unban si la condición falló",
    );

    // 2. Simular que el registro coincide exactamente y se elimina exitosamente
    tempModModel.TempModeration.findOneAndDelete = async () => ({
      _id: "mongo-id-1",
    });

    await TempModerationService.processRecord(
      clientMock,
      recordRenewed,
      new Date(),
    );

    assert.equal(
      banRemoved,
      true,
      "Debe remover el ban en Discord si el registro fue eliminado condicionalmente",
    );
    assert.equal(
      loggedActions.some((a) => a.actionType === "UNBAN"),
      true,
      "Debe registrar log de UNBAN",
    );
  } finally {
    tempModModel.TempModeration.findOneAndDelete = originalFindOneAndDelete;
    HoshikoLogger.logAction = originalLogAction;
  }
});

test("AUD-09: normalizeText remueve Hangul Fillers y variantes Unicode invisibles detectando evasiones", () => {
  // Hangul Fillers (\u3164, \u115F, \u1160, \uFFA0), grapheme joiner (\u034F), zero-width (\u200B)
  const evasionText = "b\u3164a\u115Fd\u034Fw\uFFA0o\u17B4r\u17B5d";
  const normalized = normalizeText(evasionText);

  assert.equal(
    normalized,
    "badword",
    "Debe purgar completamente los caracteres invisibles y fillers",
  );

  const check = checkBannedWords(evasionText, ["badword"]);
  assert.equal(
    check.hit,
    true,
    "Debe detectar la palabra prohibida a pesar de los fillers Unicode",
  );

  // Verificar que palabras compuestas con guiones normales no sufran falsos positivos
  const legitCompound = "spider-man pass-through well-associated";
  const checkLegit = checkBannedWords(legitCompound, ["ass", "bad"]);
  assert.equal(
    checkLegit.hit,
    false,
    "Palabras legítimas con guiones no deben colisionar con filtros",
  );
});

test("AUD-10: isKnownPhishingLink detecta subdominios maliciosos basados en dominios padre", () => {
  // Dominio conocido en lista: steamcomminuty.com y dlscord.com
  const directLink = "https://steamcomminuty.com/tradeoffer";
  const subdomainLink1 = "https://login.steamcomminuty.com/auth";
  const deepSubdomainLink =
    "http://trade.offers.steamcomminuty.com/profiles/123";
  const dlscordSubdomain = "https://free-nitro.gift.dlscord.com/claim";

  assert.equal(
    isKnownPhishingLink(directLink),
    true,
    "Debe detectar host directo",
  );
  assert.equal(
    isKnownPhishingLink(subdomainLink1),
    true,
    "Debe detectar subdominio nivel 1",
  );
  assert.equal(
    isKnownPhishingLink(deepSubdomainLink),
    true,
    "Debe detectar subdominio multinivel",
  );
  assert.equal(
    isKnownPhishingLink(dlscordSubdomain),
    true,
    "Debe detectar subdominio de dlscord",
  );

  // Enlaces legítimos limpios
  assert.equal(
    isKnownPhishingLink("https://steamcommunity.com/id/legit"),
    false,
  );
  assert.equal(isKnownPhishingLink("https://google.com"), false);
  assert.equal(isKnownPhishingLink("https://discord.com"), false);
});

test("AUD-11: checkSpamForUser previene acciones duplicadas ante ráfagas concurrentes", async () => {
  const guild = {
    id: "guild-aud11",
    name: "Guild AntiSpam",
  };
  const userId = "user-spammer-burst";

  automodState.clearSpamActionInProgress(guild.id, userId);

  // Enviar ráfaga de 6 llamadas consecutivas simultáneas
  const results = [];
  for (let i = 0; i < 6; i++) {
    const action = await automodState.checkSpamForUser(guild, userId);
    if (action) results.push(action);
  }

  // De las 6 llamadas, solo una debe haber generado la acción de mute
  assert.equal(
    results.length,
    1,
    "Solo debe dispararse 1 acción de mute ante la ráfaga",
  );
  assert.equal(results[0].type, "mute");

  // Llamadas posteriores inmediatas mientras esté en progreso deben retornar null
  const extraCall = await automodState.checkSpamForUser(guild, userId);
  assert.equal(
    extraCall,
    null,
    "Llamadas durante el flag in-progress deben retornar null",
  );

  automodState.clearSpamActionInProgress(guild.id, userId);
});

test("AUD-12: sanitizeSecrets enmascara recursivamente tokens de Discord, claves de Google, Webhooks y cabeceras sensibles", () => {
  const dummyDiscordToken = [
    "MTExMjIzMzQ0NTU2Njc3ODg5",
    "GxxXXx",
    "YyyYYyZzzZZz_1234567890abcdefgh",
  ].join(".");
  const dummyGeminiKey = [
    "AIzaSy",
    "D1234567890abcdefghijklmnopqrstuv",
  ].join("");

  const dirtyMetadata = {
    authHeader: `Bot ${dummyDiscordToken}`,
    rawDiscordToken: dummyDiscordToken,
    geminiKey: dummyGeminiKey,
    webhookUrl:
      "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz0123456789_-ABCDEF",
    canaryWebhook:
      "https://canary.discordapp.com/api/webhooks/9876543210/TOKEN_ABC_123",
    nested: {
      authorization: "Bearer secret-token-xyz",
      apiKey: "super-secret-key",
      message:
        `Failed calling https://discord.com/api/webhooks/111/xyz with token ${dummyGeminiKey}`,
      safeNumber: 42,
      safeBool: true,
    },
    list: [
      dummyGeminiKey,
      "texto seguro sin secretos",
    ],
  };

  const sanitized = sanitizeSecrets(dirtyMetadata);

  // Validaciones
  assert.equal(
    sanitized.authHeader.includes("MTExMjIzMzQ0NTU2Njc3ODg5"),
    false,
    "No debe contener el token de Discord",
  );
  assert.ok(sanitized.authHeader.includes("[REDACTED"));

  assert.equal(
    sanitized.rawDiscordToken.includes("MTExMjIzMzQ0NTU2Njc3ODg5"),
    false,
  );
  assert.ok(sanitized.rawDiscordToken.includes("[REDACTED_DISCORD_TOKEN]"));

  assert.equal(
    sanitized.geminiKey.includes("AIzaSyD1234567890"),
    false,
    "No debe contener la API Key de Gemini",
  );
  assert.equal(sanitized.geminiKey, "[REDACTED_GOOGLE_API_KEY]");

  assert.equal(
    sanitized.webhookUrl.includes("abcdefghijklmnopqrstuvwxyz"),
    false,
    "No debe contener el token del webhook",
  );
  assert.equal(
    sanitized.webhookUrl,
    "https://discord.com/api/webhooks/[REDACTED_WEBHOOK]",
  );

  assert.equal(sanitized.nested.authorization, "[REDACTED_SECRET]");
  assert.equal(sanitized.nested.apiKey, "[REDACTED_SECRET]");
  assert.equal(
    sanitized.nested.message.includes("AIzaSyD1234567890"),
    false,
    "Los mensajes anidados deben redactar secretos",
  );
  assert.equal(sanitized.nested.safeNumber, 42);
  assert.equal(sanitized.nested.safeBool, true);

  assert.equal(sanitized.list[0], "[REDACTED_GOOGLE_API_KEY]");
  assert.equal(sanitized.list[1], "texto seguro sin secretos");
});
