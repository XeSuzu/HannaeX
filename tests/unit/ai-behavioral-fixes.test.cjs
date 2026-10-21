const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

// Cargar módulos compilados
const {
  ADMIN_MARKER,
  markAsAdminMessage,
  markAsAiMessage,
  isAiMessage,
  isAdminMessage,
  stripAdminMarker,
} = require(path.join(buildDir, "Features/ai/adminMessageTracker.js"));

const {
  stripQuotesAndCode,
  isMentionTrigger,
  resolveReplyingToBot,
  checkReplyingToBot,
} = require(path.join(buildDir, "Utils/triggerConditions.js"));

const {
  buildConversationContext,
  sanitizeDialogueContent,
} = require(path.join(buildDir, "Features/ai/conversationContext.js"));

const { SystemPrompts } = require(path.join(buildDir, "Utils/AI/SystemPrompts.js"));
const { handleCulture } = require(path.join(buildDir, "Features/cultureHandler.js"));
const { UserMemoryManager } = require(path.join(buildDir, "Database/ai/UserMemoryManager.js"));
const handleAi = require(path.join(buildDir, "Features/aiHandler.js")).default;
const ServerConfig = require(path.join(buildDir, "Database/guild/serverConfig.model.js")).default;

// ============================================================================
// FASE 1: MENSAJES ADMINISTRATIVOS Y /say (ESC-01, ESC-02, ESC-03)
// ============================================================================

test("Fase 1 (ESC-01 / H-01): isAdminMessage clasifica de forma centralizada y estructural", () => {
  const msgId = "msg_admin_12345";
  assert.equal(isAdminMessage({ id: msgId, content: "Anuncio normal" }), false);

  // Registro en caché
  markAsAdminMessage(msgId);
  assert.equal(isAdminMessage({ id: msgId, content: "Anuncio normal" }), true);

  // Detección por marcador invisible (sobrevive a reinicios)
  const rebootMsg = { id: "msg_unknown_67890", content: `Aviso oficial${ADMIN_MARKER}` };
  assert.equal(isAdminMessage(rebootMsg), true);

  // Detección estructural de embeds y components
  assert.equal(isAdminMessage({ id: "embed_msg_1", embeds: [{ title: "Level Up" }] }), true);
  assert.equal(isAdminMessage({ id: "comp_msg_1", components: [{ type: 1 }] }), true);

  // Detección de mensajes de alerta/error en texto plano
  assert.equal(isAdminMessage({ content: "❌ No tienes permisos para usar este comando." }), true);
  assert.equal(isAdminMessage({ content: "⚠️ Debes escribir un mensaje válido." }), true);
  assert.equal(isAdminMessage({ content: "🚨 **usuario**, enlace malicioso bloqueado." }), true);

  // Mensaje explícitamente registrado como IA legítimo no es admin
  const aiMsgId = "ai_msg_legit_999";
  markAsAiMessage(aiMsgId);
  assert.equal(isAdminMessage({ id: aiMsgId, content: "Hola, soy Hoshiko!" }), false);

  // stripAdminMarker limpia el texto
  assert.equal(stripAdminMarker(`Aviso oficial${ADMIN_MARKER}`), "Aviso oficial");

  // Salida utilitaria de translate.ts contiene ADMIN_MARKER y es clasificada como administrativa
  const translateOutput = {
    id: "trans_msg_101",
    content: `🌐 Traducción (English → Spanish):\nHola mundo${ADMIN_MARKER}`,
  };
  assert.equal(isAdminMessage(translateOutput), true, "La salida de traducción debe ser reconocida como administrativa");
  assert.equal(
    stripAdminMarker(translateOutput.content),
    "🌐 Traducción (English → Spanish):\nHola mundo",
    "stripAdminMarker debe limpiar el marcador de la traducción",
  );
});

test("Fase 1 (translate): resolveReplyingToBot descarta respuestas a mensajes de traducción", async () => {
  const client = { user: { id: "bot_123" } };

  // Mensaje que responde a una traducción previa de translate.ts
  const repliedTranslateMsg = {
    id: "trans_msg_202",
    author: { id: "bot_123" },
    content: `🌐 Traducción (English → Spanish):\nHola mundo${ADMIN_MARKER}`,
  };

  const userReplyMsg = {
    reference: { messageId: "trans_msg_202" },
    mentions: { everyone: false },
    channel: {
      messages: {
        fetch: async (id) => (id === "trans_msg_202" ? repliedTranslateMsg : null),
      },
    },
  };

  const res = await resolveReplyingToBot(userReplyMsg, client);
  assert.equal(res.isReply, false, "Responder a una traducción no debe activar la IA");
  assert.equal(res.repliedMsg, repliedTranslateMsg);

  const checkResult = await checkReplyingToBot(userReplyMsg, client, repliedTranslateMsg);
  assert.equal(checkResult, false);
});

test("Fase 1 (ESC-01 y ESC-02): resolveReplyingToBot descarta respuestas a mensajes de /say", async () => {
  const client = { user: { id: "bot_123" } };

  // Mensaje que responde a un /say (marcado con ADMIN_MARKER)
  const repliedAdminMsg = {
    id: "say_msg_001",
    author: { id: "bot_123" },
    content: `Bienvenidos al servidor${ADMIN_MARKER}`,
  };

  const userReplyMsg = {
    reference: { messageId: "say_msg_001" },
    mentions: { everyone: false },
    channel: {
      messages: {
        fetch: async (id) => (id === "say_msg_001" ? repliedAdminMsg : null),
      },
    },
  };

  const res = await resolveReplyingToBot(userReplyMsg, client);
  assert.equal(res.isReply, false);
  assert.equal(res.repliedMsg, repliedAdminMsg);

  // checkReplyingToBot con preFetchedRepliedMsg
  const checkResult = await checkReplyingToBot(userReplyMsg, client, repliedAdminMsg);
  assert.equal(checkResult, false);
});

test("Fase 1 (ESC-03): resolveReplyingToBot aprueba respuestas a mensajes conversacionales legítimos del bot", async () => {
  const client = { user: { id: "bot_123" } };

  const repliedConversationalMsg = {
    id: "ai_reply_002",
    author: { id: "bot_123" },
    content: "¡Hola! Sí, me encantan los videojuegos nyaa~",
  };

  const userReplyMsg = {
    reference: { messageId: "ai_reply_002" },
    mentions: { everyone: false },
    channel: {
      messages: {
        fetch: async (id) => (id === "ai_reply_002" ? repliedConversationalMsg : null),
      },
    },
  };

  const res = await resolveReplyingToBot(userReplyMsg, client);
  assert.equal(res.isReply, true);
  assert.equal(res.repliedMsg, repliedConversationalMsg);

  // checkReplyingToBot reutilizando preFetched sin segundo fetch
  let fetchCalled = false;
  const channelWithSpy = {
    messages: {
      fetch: async () => {
        fetchCalled = true;
        return repliedConversationalMsg;
      },
    },
  };
  const fastMsg = { ...userReplyMsg, channel: channelWithSpy };
  const checkFast = await checkReplyingToBot(fastMsg, client, repliedConversationalMsg);
  assert.equal(checkFast, true);
  assert.equal(fetchCalled, false, "No debe realizar un segundo fetch si ya fue provisto");
});

test("Fase 1 (Regresión /say y /translate): handleAi no se activa ante respuestas con ping de Discord sin mención en texto", async () => {
  const client = { user: { id: "bot_123" } };

  // Stub de configuración para evitar conexión a BD
  const origFindOne = ServerConfig.findOne;
  const fakeDoc = {
    prefix: "x",
    aiSystem: { mode: "neko", behavior: "normal", randomChance: 0, spontaneousChannels: [] },
  };
  ServerConfig.findOne = () => {
    const query = Promise.resolve(fakeDoc);
    query.lean = () => Promise.resolve(fakeDoc);
    return query;
  };

  try {
    // 1. Mensaje de salida de /say con ADMIN_MARKER
    const sayMsg = {
      id: "say_msg_real_001",
      author: { id: "bot_123" },
      content: `Aviso oficial del servidor${ADMIN_MARKER}`,
      embeds: [],
      components: [],
    };

    // Mensaje de usuario en Discord que pulsa "Responder" a /say.
    // En Discord, al pulsar "Responder" con ping activo:
    // - Discord rellena mentions.users con el bot
    // - PERO el contenido escrito por el usuario NO contiene '<@bot_123>'
    const userMapWithBot = new Map([["bot_123", { id: "bot_123" }]]);
    const replyToSayMsg = {
      id: "user_msg_reply_say",
      author: { id: "user_carlos", bot: false, username: "Carlos" },
      guild: { id: "guild_123", name: "Servidor Test" },
      channel: {
        id: "channel_gen",
        isTextBased: () => true,
        messages: {
          fetch: async (id) => (id === "say_msg_real_001" ? sayMsg : null),
        },
      },
      reference: { messageId: "say_msg_real_001" },
      mentions: {
        everyone: false,
        users: userMapWithBot,
        repliedUser: { id: "bot_123" },
      },
      content: "jajaja qué buen aviso", // NO escribió <@bot_123>
    };

    // Comprobar que isMentionTrigger NO cae en el falso positivo del ping de respuesta
    assert.equal(
      isMentionTrigger(replyToSayMsg, client),
      false,
      "isMentionTrigger debe retornar false cuando el ping proviene de la respuesta y no del texto",
    );

    // Flujo resolveReplyingToBot
    const { isReply: isSayReply, repliedMsg: resolvedSay } = await resolveReplyingToBot(replyToSayMsg, client);
    assert.equal(isSayReply, false, "resolveReplyingToBot debe marcar isReply: false para /say");

    // Flujo handleAi con preFetchedRepliedMsg
    const sayActivated = await handleAi(replyToSayMsg, client, isSayReply, resolvedSay);
    assert.equal(sayActivated, false, "handleAi NO debe invocar Gemini al responder a un /say sin mención explícita");

    // 2. Mensaje de salida de /translate (Slash Command con Embed)
    const translateSlashMsg = {
      id: "trans_slash_002",
      author: { id: "bot_123" },
      content: "",
      embeds: [{ title: "🌐 Traducción (Gemini)", description: "Hello world" }],
      components: [],
    };

    const replyToTranslateSlashMsg = {
      id: "user_msg_reply_trans_slash",
      author: { id: "user_carlos", bot: false, username: "Carlos" },
      guild: { id: "guild_123", name: "Servidor Test" },
      channel: {
        id: "channel_gen",
        isTextBased: () => true,
        messages: {
          fetch: async (id) => (id === "trans_slash_002" ? translateSlashMsg : null),
        },
      },
      reference: { messageId: "trans_slash_002" },
      mentions: {
        everyone: false,
        users: userMapWithBot,
        repliedUser: { id: "bot_123" },
      },
      content: "buena traducción, gracias",
    };

    const { isReply: isTransReply, repliedMsg: resolvedTrans } = await resolveReplyingToBot(replyToTranslateSlashMsg, client);
    assert.equal(isTransReply, false, "resolveReplyingToBot debe marcar isReply: false para /translate con embed");

    const transActivated = await handleAi(replyToTranslateSlashMsg, client, isTransReply, resolvedTrans);
    assert.equal(transActivated, false, "handleAi NO debe invocar Gemini al responder a /translate sin mención explícita");

    // 3. Mensaje de salida de translate por prefijo con ADMIN_MARKER
    const translatePrefixMsg = {
      id: "trans_pref_003",
      author: { id: "bot_123" },
      content: `🌐 Traducción (English → Spanish):\nHola mundo${ADMIN_MARKER}`,
      embeds: [],
      components: [],
    };

    const replyToTransPrefMsg = {
      id: "user_msg_reply_trans_pref",
      author: { id: "user_carlos", bot: false, username: "Carlos" },
      guild: { id: "guild_123", name: "Servidor Test" },
      channel: {
        id: "channel_gen",
        isTextBased: () => true,
        messages: {
          fetch: async (id) => (id === "trans_pref_003" ? translatePrefixMsg : null),
        },
      },
      reference: { messageId: "trans_pref_003" },
      mentions: {
        everyone: false,
        users: userMapWithBot,
        repliedUser: { id: "bot_123" },
      },
      content: "entendido!",
    };

    const { isReply: isPrefReply, repliedMsg: resolvedPref } = await resolveReplyingToBot(replyToTransPrefMsg, client);
    assert.equal(isPrefReply, false);

    const transPrefActivated = await handleAi(replyToTransPrefMsg, client, isPrefReply, resolvedPref);
    assert.equal(transPrefActivated, false, "handleAi NO debe invocar Gemini al responder a translate prefijo");

    // 4. Mención explícita en texto al responder a un /say o /translate
    const explicitMentionReply = {
      ...replyToSayMsg,
      id: "user_explicit_004",
      content: "<@bot_123> ¿por qué publicaste ese aviso?",
    };

    assert.equal(
      isMentionTrigger(explicitMentionReply, client),
      true,
      "isMentionTrigger DEBE retornar true cuando el usuario escribe explícitamente <@bot_123>",
    );

    // 5. Respuesta entre dos usuarios comunes (Alice responde a Bob)
    const bobMsg = {
      id: "bob_msg_999",
      author: { id: "user_bob", bot: false },
      content: "¿Vieron el partido?",
    };
    const aliceReplyToBob = {
      id: "alice_msg_888",
      author: { id: "user_alice", bot: false, username: "Alice" },
      guild: { id: "guild_123", name: "Servidor Test" },
      channel: {
        id: "channel_gen",
        isTextBased: () => true,
        messages: { fetch: async () => bobMsg },
      },
      reference: { messageId: "bob_msg_999" },
      mentions: {
        everyone: false,
        users: new Map([["user_bob", { id: "user_bob" }]]),
        repliedUser: { id: "user_bob" },
      },
      content: "sí, estuvo increíble",
    };

    const { isReply: isBobReply } = await resolveReplyingToBot(aliceReplyToBob, client);
    assert.equal(isBobReply, false, "Respuesta entre humanos no es respuesta al bot");
    const aliceActivated = await handleAi(aliceReplyToBob, client, false, bobMsg);
    assert.equal(aliceActivated, false, "handleAi no debe activarse en diálogo entre humanos");

    // 6. Supervivencia ante reinicio (caché fría sin IDs previos)
    // Mensaje nunca antes visto en caché con ADMIN_MARKER
    const coldRebootMsg = {
      id: "never_seen_before_id_999",
      author: { id: "bot_123" },
      content: `Aviso oficial tras reinicio${ADMIN_MARKER}`,
      embeds: [],
      components: [],
    };
    assert.equal(
      isAdminMessage(coldRebootMsg),
      true,
      "isAdminMessage debe reconocer ADMIN_MARKER incluso si el ID no existe en memoria",
    );
  } finally {
    ServerConfig.findOne = origFindOne;
  }
});

test("Fase 1 (Casos A-I): Cumplimiento estricto de las reglas obligatorias de activación", async () => {
  const client = { user: { id: "bot_123" } };
  const origFindOne = ServerConfig.findOne;
  const fakeDoc = {
    prefix: "x",
    aiSystem: { mode: "neko", behavior: "normal", randomChance: 0, spontaneousChannels: [] },
  };
  ServerConfig.findOne = () => {
    const query = Promise.resolve(fakeDoc);
    query.lean = () => Promise.resolve(fakeDoc);
    return query;
  };

  try {
    // --- CASO A: Mención inicial explícita ---
    const msgCasoA = {
      id: "msg_a",
      author: { id: "user_a", bot: false, username: "Alice" },
      guild: { id: "g1", name: "Guild" },
      channel: { id: "c1", isTextBased: () => true },
      mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
      content: "<@bot_123>, ¿qué opinas?",
    };
    assert.equal(isMentionTrigger(msgCasoA, client), true, "Caso A: mención inicial debe ser trigger válido");

    // --- CASO B: Respuesta a mensaje conversacional de Hoshiko SIN mención ---
    const convMsg = {
      id: "hoshiko_conv_001",
      author: { id: "bot_123" },
      content: "¡Hola! ¿Cómo estás?",
      embeds: [],
      components: [],
    };
    const msgCasoB = {
      id: "msg_b",
      author: { id: "user_b", bot: false, username: "Bob" },
      guild: { id: "g1", name: "Guild" },
      channel: {
        id: "c1",
        isTextBased: () => true,
        messages: { fetch: async () => convMsg },
      },
      reference: { messageId: "hoshiko_conv_001" },
      mentions: {
        everyone: false,
        users: new Map([["bot_123", { id: "bot_123" }]]), // Ping automático de Discord
        repliedUser: { id: "bot_123" },
      },
      content: "todo bien y vos?", // SIN mención en texto
    };
    // 1. isMentionTrigger debe ser false
    assert.equal(isMentionTrigger(msgCasoB, client), false, "Caso B: isMentionTrigger debe ser false");
    // 2. resolveReplyingToBot clasifica el mensaje referenciado como conversacional
    const { isReply: isReplyB, repliedMsg: repliedMsgB } = await resolveReplyingToBot(msgCasoB, client);
    assert.equal(isReplyB, true, "resolveReplyingToBot identifica que fue respuesta a mensaje conversacional");
    // 3. messageCreate calcula isDirect = isMention || isHoshiCall (SIN isReply)
    const isDirectB = isMentionTrigger(msgCasoB, client);
    assert.equal(isDirectB, false, "Caso B: isDirect en messageCreate debe ser false");
    // 4. handleAi NO activa Gemini
    const actB = await handleAi(msgCasoB, client, isDirectB, repliedMsgB);
    assert.equal(actB, false, "Caso B: handleAi NO debe activar Gemini ante respuesta sin mención explícita");

    // --- CASO C: Respuesta a mensaje conversacional de Hoshiko CON mención inicial ---
    const msgCasoC = {
      ...msgCasoB,
      id: "msg_c",
      content: "<@bot_123> sí, opino exactamente lo mismo",
    };
    assert.equal(isMentionTrigger(msgCasoC, client), true, "Caso C: mención inicial en respuesta debe ser true");
    const isDirectC = isMentionTrigger(msgCasoC, client);
    assert.equal(isDirectC, true, "Caso C: isDirect en messageCreate debe ser true");

    // --- CASO D: Mención en medio del texto ---
    const msgCasoD = {
      id: "msg_d",
      author: { id: "user_d", bot: false, username: "David" },
      guild: { id: "g1", name: "Guild" },
      channel: { id: "c1", isTextBased: () => true },
      mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
      content: "Estaba pensando en algo, <@bot_123>, ¿qué opinas?",
    };
    assert.equal(isMentionTrigger(msgCasoD, client), false, "Caso D: mención no inicial debe retornar false");
    const actD = await handleAi(msgCasoD, client, false, null);
    assert.equal(actD, false, "Caso D: handleAi no debe activar Gemini ante mención en medio del texto");

    // --- CASO E: Respuesta a /say sin mención inicial ---
    const sayMsg = {
      id: "say_admin_001",
      author: { id: "bot_123" },
      content: `Aviso oficial del servidor${ADMIN_MARKER}`,
      embeds: [],
      components: [],
    };
    const msgCasoE = {
      id: "msg_e",
      author: { id: "user_e", bot: false, username: "Elena" },
      guild: { id: "g1", name: "Guild" },
      channel: {
        id: "c1",
        isTextBased: () => true,
        messages: { fetch: async () => sayMsg },
      },
      reference: { messageId: "say_admin_001" },
      mentions: {
        everyone: false,
        users: new Map([["bot_123", { id: "bot_123" }]]),
        repliedUser: { id: "bot_123" },
      },
      content: "muy claro el aviso",
    };
    assert.equal(isMentionTrigger(msgCasoE, client), false);
    const { isReply: isReplyE, repliedMsg: repliedMsgE } = await resolveReplyingToBot(msgCasoE, client);
    assert.equal(isReplyE, false);
    const actE = await handleAi(msgCasoE, client, false, repliedMsgE);
    assert.equal(actE, false, "Caso E: respuesta a /say no activa");

    // --- CASO F: Respuesta a /translate sin mención inicial ---
    const transMsg = {
      id: "trans_admin_001",
      author: { id: "bot_123" },
      content: "",
      embeds: [{ title: "🌐 Traducción (Gemini)", description: "Hello world" }],
      components: [],
    };
    const msgCasoF = {
      id: "msg_f",
      author: { id: "user_f", bot: false, username: "Frank" },
      guild: { id: "g1", name: "Guild" },
      channel: {
        id: "c1",
        isTextBased: () => true,
        messages: { fetch: async () => transMsg },
      },
      reference: { messageId: "trans_admin_001" },
      mentions: {
        everyone: false,
        users: new Map([["bot_123", { id: "bot_123" }]]),
        repliedUser: { id: "bot_123" },
      },
      content: "buena traducción",
    };
    assert.equal(isMentionTrigger(msgCasoF, client), false);
    const { isReply: isReplyF, repliedMsg: repliedMsgF } = await resolveReplyingToBot(msgCasoF, client);
    assert.equal(isReplyF, false);
    const actF = await handleAi(msgCasoF, client, false, repliedMsgF);
    assert.equal(actF, false, "Caso F: respuesta a /translate no activa");

    // --- CASO G: Ping automático de Discord al responder sin mención en texto ---
    const msgCasoG = {
      id: "msg_g",
      author: { id: "user_g", bot: false, username: "Grace" },
      guild: { id: "g1", name: "Guild" },
      channel: { id: "c1", isTextBased: () => true },
      reference: { messageId: "any_msg" },
      mentions: {
        everyone: false,
        users: new Map([["bot_123", { id: "bot_123" }]]),
        repliedUser: { id: "bot_123" },
      },
      content: "solo respondo con ping nativo sin escribir arroba",
    };
    assert.equal(isMentionTrigger(msgCasoG, client), false, "Caso G: ping automático no debe ser trigger");
    const actG = await handleAi(msgCasoG, client, false, null);
    assert.equal(actG, false, "Caso G: handleAi no activa con ping automático");

    // --- CASO H: Mensaje normal entre usuarios ---
    const msgCasoH = {
      id: "msg_h",
      author: { id: "user_h1", bot: false, username: "Hugo" },
      guild: { id: "g1", name: "Guild" },
      channel: { id: "c1", isTextBased: () => true },
      mentions: {
        everyone: false,
        users: new Map([["user_h2", { id: "user_h2" }]]),
      },
      content: "hola Hugo cómo va todo",
    };
    assert.equal(isMentionTrigger(msgCasoH, client), false);
    const actH = await handleAi(msgCasoH, client, false, null);
    assert.equal(actH, false, "Caso H: diálogo entre humanos no activa");

    // --- CASO I: Mecanismo existente admitido (prefijo ask) ---
    const msgCasoI = {
      id: "msg_i",
      author: { id: "user_i", bot: false, username: "Ivan" },
      guild: { id: "g1", name: "Guild" },
      channel: { id: "c1", isTextBased: () => true },
      mentions: { everyone: false, users: new Map() },
      content: "hoshi ask qué hora es?",
    };
    const prefixMatch = /^(?:hoshi(?:\s+ask)?|(?:x|x|h!)\s*ask)\b/i.test(msgCasoI.content.trim());
    assert.equal(prefixMatch, true, "Caso I: comando ask por prefijo debe ser reconocido");
  } finally {
    ServerConfig.findOne = origFindOne;
  }
});

// ============================================================================
// FASE 2: DISPARADORES E INTENCIÓN SOCIAL (ESC-04 a ESC-09 y ESC-19)
// ============================================================================

test("Fase 2 (ESC-04 y ESC-05): stripQuotesAndCode elimina blockquotes y código", () => {
  const quoteMsg = "> <@bot_123> qué hora es?\nJuan mira lo que le puse";
  const stripped = stripQuotesAndCode(quoteMsg);
  assert.equal(stripped.includes("<@bot_123>"), false);
  assert.equal(stripped.includes("Juan mira lo que le puse"), true);

  const codeMsg = "mira este snippet:\n```js\n<@bot_123> inside code\n```\nqué opinas?";
  const strippedCode = stripQuotesAndCode(codeMsg);
  assert.equal(strippedCode.includes("<@bot_123>"), false);
  assert.equal(strippedCode.includes("qué opinas?"), true);
});

test("Fase 2 (ESC-04): isMentionTrigger ignora menciones dentro de citas y acepta menciones fuera", () => {
  const client = { user: { id: "bot_123" } };

  // Caso 1: mención exclusivamente dentro de la cita
  const msgOnlyQuote = {
    content: "> <@bot_123> recomiéndame algo\nCarlos le preguntó esto ayer",
    mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
  };
  assert.equal(isMentionTrigger(msgOnlyQuote, client), false);

  // Caso 2: cita previa pero con mención legítima fuera de la cita
  const msgQuoteWithMention = {
    content: "> texto de cita previa\n<@bot_123> ¿qué opinas de eso?",
    mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
  };
  assert.equal(isMentionTrigger(msgQuoteWithMention, client), true);
});

test("Fase 2 (ESC-06 / H-02): isMentionTrigger discrimina con regla estructural determinista", () => {
  const client = { user: { id: "bot_123" } };

  // 1. Destinatario primario es Carlos en oración corta
  const msgSecondaryShort = {
    content: "<@user_carlos> mira lo que me dijo <@bot_123> ayer en la noche",
    mentions: {
      users: new Map([
        ["user_carlos", { id: "user_carlos" }],
        ["bot_123", { id: "bot_123" }],
      ]),
    },
  };
  assert.equal(isMentionTrigger(msgSecondaryShort, client), false);

  // 2. Destinatario primario es Carlos en oración LARGA (supera los antiguos 20 caracteres)
  const msgSecondaryLong = {
    content: "Ayer estuvimos hablando largo y tendido con Juan en el canal y le pedí a <@user_carlos> que le preguntara a <@bot_123> sobre el tema",
    mentions: {
      users: new Map([
        ["user_carlos", { id: "user_carlos" }],
        ["bot_123", { id: "bot_123" }],
      ]),
    },
  };
  assert.equal(isMentionTrigger(msgSecondaryLong, client), false, "Una oración larga no debe confundir la mención secundaria");

  // 3. Destinatario primario es Hoshiko (es la primera mención)
  const msgPrimary = {
    content: "<@bot_123> dile a <@user_carlos> que ya llegué",
    mentions: {
      users: new Map([
        ["bot_123", { id: "bot_123" }],
        ["user_carlos", { id: "user_carlos" }],
      ]),
    },
  };
  assert.equal(isMentionTrigger(msgPrimary, client), true);

  // 4. Vocativo final explícito tras otro usuario (no es mención inicial)
  const msgVocativeFinal = {
    content: "<@user_carlos>, qué opinas tú? ¿Y tú, <@bot_123>?",
    mentions: {
      users: new Map([
        ["user_carlos", { id: "user_carlos" }],
        ["bot_123", { id: "bot_123" }],
      ]),
    },
  };
  assert.equal(isMentionTrigger(msgVocativeFinal, client), false, "La mención no inicial debe ser rechazada conforme a la regla de mención inicial");

  // 5. Mención al final pero SIN vocativo (ej. 'pregúntale a <@user_carlos> y luego a <@bot_123>')
  const msgEndNoVocative = {
    content: "Dile a <@user_carlos> que luego consulte con <@bot_123>",
    mentions: {
      users: new Map([
        ["user_carlos", { id: "user_carlos" }],
        ["bot_123", { id: "bot_123" }],
      ]),
    },
  };
  assert.equal(isMentionTrigger(msgEndNoVocative, client), false);
});

test("Fase 2 (ESC-07): Invocación directa estándar con mención", () => {
  const client = { user: { id: "bot_123" } };
  const directMsg = {
    content: "<@bot_123> ¿cómo estás hoy?",
    mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
  };
  assert.equal(isMentionTrigger(directMsg, client), true);
});

test("Fase 2 (ESC-19): Exclusión de prefijos en activaciones espontáneas", () => {
  const escapedPrefix = "x";
  const isEligible = (rawContent) =>
    rawContent.length >= 20 &&
    rawContent.length <= 300 &&
    !rawContent.includes("http://") &&
    !rawContent.includes("https://") &&
    !rawContent.startsWith(escapedPrefix) &&
    !rawContent.startsWith("!") &&
    !rawContent.startsWith("/") &&
    !rawContent.startsWith("h!") &&
    !rawContent.startsWith("x") &&
    !/^(?:hoshi\b|h!\s*)/i.test(rawContent);

  assert.equal(isEligible("h! banallporfavorrapido12345678"), false);
  assert.equal(isEligible("x unComandoLargoQueNoExiste9999"), false);
  assert.equal(isEligible("!warn usuarioPorSpamMasivo1234"), false);
  assert.equal(isEligible("/say mensajeAdministrativoLargo"), false);
  assert.equal(isEligible("hoshi ask explicame la fotosintesis"), false);

  // Conversación casual legítima sí es elegible
  assert.equal(isEligible("oigan chicos qué juego recomiendan para esta noche de sábado?"), true);
});

// ============================================================================
// FASE 3: HISTORIAL MULTIJUGADOR (ESC-12, ESC-13)
// ============================================================================

test("Fase 3 (ESC-12): buildConversationContext preserva contexto multijugador y separa /say", async () => {
  const originalGetFacts = UserMemoryManager.getFacts;
  UserMemoryManager.getFacts = async () => [];

  try {
    const client = { user: { id: "bot_123", username: "Hoshiko" } };
    const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };

    const emptyAttachments = { size: 0, first: () => null };
    const currentMsg = {
      id: "m4",
      guild: { id: "guild_1", name: "Servidor Test" },
      channel: {
        name: "general",
        messages: {
          fetch: async () => messageMap,
        },
      },
      author: { id: "user_bob", username: "Bob" },
      content: "<@bot_123> ¿y qué parte te gustó más?",
      attachments: emptyAttachments,
      mentions: { users: new Map([["bot_123", { id: "bot_123" }]]) },
    };

    const messageMap = new Map();
    // En Discord.js, messages.fetch devuelve los mensajes en orden descendente (el más nuevo primero)
    messageMap.set("m4", currentMsg);
    messageMap.set("m3", {
      id: "m3",
      author: { id: "bot_123", username: "Hoshiko" },
      content: "¡A mí me pareció genial Alice, los efectos visuales estaban increíbles!",
      attachments: emptyAttachments,
      reference: { messageId: "m1" },
      mentions: { repliedUser: { id: "user_alice", username: "Alice" } },
    });
    messageMap.set("m2", {
      id: "m2",
      author: { id: "bot_123", username: "Hoshiko" },
      content: `Recordatorio: limpieza de canales mañana${ADMIN_MARKER}`,
      attachments: emptyAttachments,
      mentions: { repliedUser: null },
    });
    messageMap.set("m1", {
      id: "m1",
      author: { id: "user_alice", username: "Alice" },
      content: "¡Hola a todos! ¿Vieron la película de ayer?",
      attachments: emptyAttachments,
      mentions: { repliedUser: null },
    });

  const context = await buildConversationContext(currentMsg, client, config, {
    isPremium: false,
    isMentioned: true,
    prefixMatch: false,
    isReplyToMe: false,
    isRandomTrigger: false,
  });

  assert.ok(context.historyForApi.length > 0);

  // Verificar que el anuncio NO es role model
  const modelTurns = context.historyForApi.filter((t) => t.role === "model");
  for (const t of modelTurns) {
    const txt = t.parts[0].text;
    assert.equal(txt.includes("Recordatorio: limpieza de canales"), false, "Los anuncios de /say no deben ser turnos model");
  }

  // Verificar que la respuesta de Hoshiko indica a quién respondió
  const hoshikoTurn = modelTurns.find((t) => t.parts[0].text.includes("Alice"));
  assert.ok(hoshikoTurn, "Hoshiko debe conservar la referencia de que le respondió a Alice");
  assert.ok(hoshikoTurn.parts[0].text.startsWith("(En respuesta a Alice):"));

  // Verificar que el turno de usuario contiene el contexto de Alice y el anuncio
  const userTurns = context.historyForApi.filter((t) => t.role === "user");
  const fullUserText = userTurns.map((t) => t.parts[0].text).join("\n");
  assert.ok(fullUserText.includes("[Alice dice]:"));
  assert.ok(fullUserText.includes("[Anuncio en el canal]: Recordatorio: limpieza de canales mañana"));
  assert.ok(fullUserText.includes("[Bob dice]: ¿y qué parte te gustó más?"));

  // Verificar alternancia estricta del SDK (no puede comenzar en 'model')
  assert.notEqual(context.historyForApi[0].role, "model");
  } finally {
    UserMemoryManager.getFacts = originalGetFacts;
  }
});

// ============================================================================
// FASE 4: PERSONALIDAD EFECTIVA Y PROMPTS (ESC-10, ESC-11, ESC-14, ESC-21 a ESC-23)
// ============================================================================

test("Fase 4 (ESC-10, ESC-11): SystemPrompts contiene directiva de economía verbal", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, { currentUsername: "Carlos" });

  assert.ok(prompt.includes("Economía verbal:"));
  assert.ok(prompt.includes("1 o 2 oraciones breves"));
  assert.ok(prompt.includes("Consultas complejas:"));
});

test("Fase 4 (ESC-23): SystemPrompts relativiza la zona horaria del servidor", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, { currentUsername: "Carlos" });

  assert.ok(prompt.includes("la zona horaria del usuario puede ser distinta"));
  assert.ok(prompt.includes("no asumas de forma rígida si es de día o de noche"));
});

test("Fase 4 (ESC-14, ESC-15): SystemPrompts condiciona los recuerdos a pertinencia orgánica", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, {
    currentUsername: "Carlos",
    userFacts: ["Le gusta el café sin azúcar", "Vive en Bogotá"],
  });

  assert.ok(prompt.includes("<user_profile>"));
  assert.ok(prompt.includes("ÚNICAMENTE cuando sean relevantes de forma orgánica"));
  assert.ok(prompt.includes("NO los fuerces en saludos"));
  assert.ok(prompt.includes("Le gusta el café sin azúcar"));
});

test("Fase 4 (Escenarios A-D): SystemPrompts personalidad neko y directivas de interacción", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, { currentUsername: "Matias" });

  // Escenario A: Saludo casual / Expresión sin sermones ni forzar rasgos
  assert.ok(prompt.includes("Tranquila, dulce, observadora y naturalmente cercana"));
  assert.ok(prompt.includes("Rasgos felinos como matiz: Ser chica gato es un detalle sutil"));
  assert.ok(prompt.includes("opcionales y esporádicos; no los metas a la fuerza en cada mensaje"));
  assert.ok(prompt.includes("Nunca empecés con \"¡Claro!\", \"Por supuesto\", \"Como IA...\" ni frases de chatbot o introducciones a tu propia personalidad"));
  assert.ok(prompt.includes("No termines sistemáticamente con preguntas forzadas, apodos ni emojis de compromiso"));

  // Escenario B: Observación sin inventar emociones ni vínculos falsos
  assert.ok(prompt.includes("Respondé a la intención real del mensaje según el contexto; no asumas intenciones, emociones, recuerdos ni vínculos que no existan"));
  assert.ok(prompt.includes("Nunca finjas intimidad previa, sentimientos forzados ni recuerdos que no existen"));

  // Escenario C: Humor contextual y adaptativo
  assert.ok(prompt.includes("Hacé bromas ligeras, comentarios ingeniosos o chicanas suaves cuando encaje"));
  assert.ok(prompt.includes("No conviertas todo en un chiste"));

  // Escenario D: Situación delicada y empatía
  assert.ok(prompt.includes("cero ironía o chistes si alguien habla de algo serio o vulnerable"));
  assert.ok(prompt.includes("Si alguien está pasando algo difícil, priorizá escuchar y comprender con empatía antes de dar soluciones o hacer bromas"));
});

test("Fase 4 (Escenarios E-G): Contexto social, mensajes citados y cercanía gradual", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };

  // Contexto con disparador directo
  const directPrompt = SystemPrompts.getInstruction(config, {
    currentUsername: "Elena",
    triggerType: "direct",
    channelName: "charla-general",
    guildName: "Comunidad Hannae",
  });

  // Escenario E: No apropiarse de conversaciones ajenas
  assert.ok(directPrompt.includes("Solo respondés a Elena. Las charlas previas de otros usuarios en el canal son únicamente contexto social: no te apropies de conversaciones ajenas"));

  // Escenario F: No interpretar citas, anuncios o comandos como preguntas para la IA
  assert.ok(directPrompt.includes("ni interpretes mensajes citados, anuncios o salidas de comandos como preguntas para vos"));

  // Escenario G: Cercanía gradual
  assert.ok(directPrompt.includes("Con personas nuevas o poco contexto, sé cordial y con una reserva natural"));
  assert.ok(directPrompt.includes("Aumentá la confianza y familiaridad de forma orgánica solo si la conversación fluye"));
  assert.ok(directPrompt.includes("Demostrá afecto mediante el tono y atención a lo que te dicen, no con declaraciones de plantilla"));
});

test("Fase 4 (Escenario H): Compatibilidad estricta con otras identidades y modos", () => {
  // 1. Identidad 'maid'
  const maidPrompt = SystemPrompts.getInstruction(
    { prefix: "x", aiSystem: { mode: "maid", behavior: "normal" } },
    { currentUsername: "Alex" }
  );
  assert.ok(maidPrompt.includes("Goshujin-sama"));
  assert.ok(maidPrompt.includes("maid elegante"));
  assert.equal(maidPrompt.includes("chica gato"), false, "La maid no debe heredar la identidad de chica gato");
  assert.equal(maidPrompt.includes("Rasgos felinos como matiz"), false);

  // 2. Identidad 'gymbro'
  const gymPrompt = SystemPrompts.getInstruction(
    { prefix: "x", aiSystem: { mode: "gymbro", behavior: "agresivo" } },
    { currentUsername: "Alex" }
  );
  assert.ok(gymPrompt.includes("fitness girl con energía real"));
  assert.ok(gymPrompt.includes("Llamás a todos \"bro\" o \"máquina\""));
  assert.ok(gymPrompt.includes("Hoy estás altanera y sin filtro"));
  assert.equal(gymPrompt.includes("chica gato"), false);

  // 3. Identidad 'assistant'
  const assistPrompt = SystemPrompts.getInstruction(
    { prefix: "x", aiSystem: { mode: "assistant", behavior: "pesado" } },
    { currentUsername: "Alex" }
  );
  assert.ok(assistPrompt.includes("modo técnico"));
  assert.ok(assistPrompt.includes("Usá Markdown con estructura"));
  assert.ok(assistPrompt.includes("Hoy estás un poco cansada"));
  assert.equal(assistPrompt.includes("chica gato"), false);
  assert.equal(assistPrompt.includes("Economía verbal:"), false, "El modo asistente tiene sus propias instrucciones de formato");

  // Las reglas de límites y convivencia en CÓMO RESPONDER siguen presentes en todos
  for (const p of [maidPrompt, gymPrompt, assistPrompt]) {
    assert.ok(p.includes("Solo respondés a Alex"));
    assert.ok(p.includes("TEMAS PROHIBIDOS"));
    assert.ok(p.includes("TEMAS DELICADOS"));
  }
});

// ============================================================================
// FASE 5: LIMPIEZA DE PERSISTENCIA
// ============================================================================

test("Fase 5: handleCulture es seguro y no arroja excepciones ante mensajes no elegibles o fallos de DB", async () => {
  // 1. Mensaje de bot ignorado sin error
  const botMsg = { guild: { id: "g1" }, author: { bot: true, id: "b1" }, content: "hola" };
  await assert.doesNotReject(async () => handleCulture(botMsg));

  // 2. Mensaje de comando prefijado ignorado sin error
  const cmdMsg = { guild: { id: "g1" }, author: { bot: false, id: "u1" }, content: "/say hola" };
  await assert.doesNotReject(async () => handleCulture(cmdMsg));
});
