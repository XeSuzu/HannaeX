const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { SystemPrompts } = require(path.join(buildDir, "Utils/AI/SystemPrompts.js"));
const { isFactualOrTechnicalQuery, isResearchQuery } = require(path.join(buildDir, "Features/aiHandler.js"));
const { LocalIntentResolver } = require(path.join(buildDir, "Core/AI/Resolution/LocalIntentResolver.js"));
const geminiService = require(path.join(buildDir, "Services/gemini.js"));
const { sendConversationReply } = require(path.join(buildDir, "Features/ai/conversationReply.js"));

test("Anti-Alucinaciones: SystemPrompts incluye directiva explícita de honestidad epistémica", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, { currentUsername: "TestUser" });

  assert.ok(prompt.includes("Honestidad fáctica:"));
  assert.ok(prompt.includes("admití con naturalidad que no estás segura en vez de inventar números"));
});

test("Anti-Alucinaciones: isFactualOrTechnicalQuery detecta preguntas de datos y código", () => {
  assert.equal(isFactualOrTechnicalQuery("¿Cuándo nació Albert Einstein?"), true);
  assert.equal(isFactualOrTechnicalQuery("¿Cuál es la capital de Australia?"), true);
  assert.equal(isFactualOrTechnicalQuery("¿En qué año se fundó la ONU?"), true);
  assert.equal(isFactualOrTechnicalQuery("¿Quién escribió Cien Años de Soledad?"), true);
  assert.equal(isFactualOrTechnicalQuery("Explícame cómo funciona una función en TypeScript"), true);
  assert.equal(isFactualOrTechnicalQuery("¿Cómo se calcula el área de un círculo?"), true);

  // Mensajes casuales no deben ser clasificados como fácticos
  assert.equal(isFactualOrTechnicalQuery("Hola, ¿cómo estás hoy?"), false);
  assert.equal(isFactualOrTechnicalQuery("Qué lindo día hace afuera"), false);
  assert.equal(isFactualOrTechnicalQuery("Me gusta mucho el café"), false);
  assert.equal(isFactualOrTechnicalQuery("jajaja qué divertido"), false);
});

test("Anti-Alucinaciones: LocalIntentResolver intercepta consultas sobre sesiones pasadas fuera de contexto", async () => {
  const res1 = await LocalIntentResolver.resolve("user_123", "¿Te acuerdas de lo que hablamos ayer?");
  assert.ok(res1);
  assert.equal(res1.handled, true);
  assert.equal(res1.intent, "memory_query");
  assert.ok(res1.replyText.includes("Solo mantengo en mente los mensajes recientes"));

  const res2 = await LocalIntentResolver.resolve("user_123", "¿Qué te dije la semana pasada?");
  assert.ok(res2);
  assert.equal(res2.handled, true);
  assert.equal(res2.intent, "memory_query");

  const res3 = await LocalIntentResolver.resolve("user_123", "recuerdas nuestra charla de ayer");
  assert.ok(res3);
  assert.equal(res3.handled, true);
});

test("Anti-Alucinaciones: Fallback de Google Search inyecta instrucción de degradación offline", async () => {
  const origGenerate = geminiService.generateResponseStream;
  let calls = 0;
  let fallbackInstruction = "";
  let receivedTemp = null;

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools, options) => {
    calls++;
    receivedTemp = options?.temperature;
    if (calls === 1) {
      // Simular fallo de la herramienta de búsqueda de Google (ej. rate limit o network error)
      const err = new Error("Google Search API quota exceeded");
      err.status = 429;
      throw err;
    }

    // Segunda llamada (fallback): capturar la instrucción del sistema
    fallbackInstruction = systemInstruction;
    return (async function* () {
      yield {
        text: () => "Respuesta honesta sin inventar",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    const dummyMessage = {
      client: {
        user: {
          id: "bot_123",
          username: "Hoshiko",
          displayAvatarURL: () => "https://example.com/avatar.png",
        },
      },
      channel: { id: "ch_test" },
      reply: async (payload) => ({ id: "reply_123", ...payload }),
    };

    const result = await sendConversationReply(
      dummyMessage,
      "Sos Hoshiko.",
      [{ role: "user", parts: [{ text: "xask ¿Qué pasó hoy en las noticias?" }] }],
      true, // isDirectInteraction -> activa search
      "standard",
      "neko",
      true, // enableGoogleSearch
      0.2,  // temperature adaptativa
    );

    assert.equal(calls, 2, "Debe haber llamado a generateResponseStream 2 veces (primera falla, segunda fallback)");
    assert.ok(
      fallbackInstruction.includes("La herramienta de búsqueda web en tiempo real no está disponible"),
      "La instrucción degradada debe advertir sobre la falta de búsqueda en vivo",
    );
    assert.ok(
      fallbackInstruction.includes("no inventes información reciente"),
      "La instrucción degradada debe ordenar explícitamente no inventar datos recientes",
    );
    assert.equal(receivedTemp, 0.2, "La temperatura adaptativa debe haberse respetado en el fallback");
    assert.ok(result.fullText.includes("Respuesta honesta sin inventar"));
  } finally {
    geminiService.generateResponseStream = origGenerate;
  }
});

test("Embed de Espera: ConversationStatusManager incluye frases rotativas de Opción B con autor y footer", () => {
  const { ConversationStatusManager } = require(path.join(buildDir, "Core/AI/Status/ConversationStatusManager.js"));

  const botUser = {
    displayAvatarURL: () => "https://example.com/hoshiko.png",
  };

  // Test default
  const embedDefault = ConversationStatusManager.createStatusEmbed("default", botUser);
  assert.ok(embedDefault.data.description);
  assert.equal(embedDefault.data.author?.name, "Hoshiko");
  assert.equal(embedDefault.data.author?.icon_url, "https://example.com/hoshiko.png");
  assert.equal(embedDefault.data.footer?.text, "⚡ Pensando respuesta...");

  // Test memory
  const embedMemory = ConversationStatusManager.createStatusEmbed("memory", botUser);
  assert.equal(embedMemory.data.footer?.text, "🧠 Consultando recuerdos personales...");

  // Test research
  const embedResearch = ConversationStatusManager.createStatusEmbed("research", botUser);
  assert.equal(embedResearch.data.footer?.text, "🔍 Búsqueda web en vivo activa...");
});

test("Embed de Espera: sendConversationReply edita el statusMessage sin duplicar mensajes", async () => {
  const origGenerate = geminiService.generateResponseStream;

  geminiService.generateResponseStream = async () => {
    return (async function* () {
      yield {
        text: () => "Respuesta editada con éxito.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  let editedPayload = null;
  let replyCalled = false;

  const fakeStatusMessage = {
    id: "status_msg_001",
    edit: async (payload) => {
      editedPayload = payload;
      return { id: "status_msg_001", ...payload };
    },
  };

  const fakeMessage = {
    client: {
      user: {
        id: "bot_123",
        username: "Hoshiko",
        displayAvatarURL: () => "https://example.com/avatar.png",
      },
    },
    reply: async () => {
      replyCalled = true;
      return { id: "reply_002" };
    },
  };

  try {
    const res = await sendConversationReply(
      fakeMessage,
      "sys_inst",
      [{ role: "user", parts: [{ text: "Hola" }] }],
      true,
      "standard",
      "neko",
      false,
      0.7,
      fakeStatusMessage,
    );

    assert.ok(editedPayload, "Debe haber llamado a statusMessage.edit");
    assert.equal(replyCalled, false, "NO debe haber llamado a message.reply si statusMessage.edit tuvo éxito");
    assert.ok(res.fullText.includes("Respuesta editada con éxito"));
  } finally {
    geminiService.generateResponseStream = origGenerate;
  }
});

test("Memoria de Entidades: ServerEntityMemoryService extrae y recupera hechos sobre terceras personas", async () => {
  const { ServerEntityMemoryService } = require(path.join(buildDir, "Core/AI/Memory/ServerEntityMemoryService.js"));
  ServerEntityMemoryService.clearFallbackStore();

  const guildId = "guild_test_entities_123";

  // 1. Extraer hecho
  const text1 = "¿Sabías que Carlos es el guitarrista de la banda?";
  const extracted = ServerEntityMemoryService.extractEntityFact(text1);
  assert.ok(extracted, "Debe extraer la entidad y el hecho");
  assert.equal(extracted.entity, "Carlos");
  assert.equal(extracted.fact, "es el guitarrista de la banda");

  // 2. Guardar hecho
  const saved = await ServerEntityMemoryService.saveEntityFact(
    guildId,
    extracted.entity,
    extracted.fact,
    "user_elena_456",
    "Elena",
  );
  assert.equal(saved, true, "Debe guardar exitosamente el hecho");

  // 3. Recuperar hecho al preguntar días después
  const queryText = "¿Qué sabes de Carlos?";
  const relevant = await ServerEntityMemoryService.getRelevantEntities(guildId, queryText);
  assert.equal(relevant.length, 1);
  assert.equal(relevant[0].entity, "Carlos");
  assert.equal(relevant[0].fact, "es el guitarrista de la banda");
  assert.equal(relevant[0].sourceUsername, "Elena");

  // 4. Consulta sobre otra persona no registrada
  const irrelevant = await ServerEntityMemoryService.getRelevantEntities(guildId, "¿Qué sabes de Roberto?");
  assert.equal(irrelevant.length, 0);
});

test("Embed de Espera: sendConversationReply respeta minWaitMs antes de la edición final", async () => {
  const origGenerate = geminiService.generateResponseStream;

  geminiService.generateResponseStream = async () => {
    return (async function* () {
      yield {
        text: () => "Respuesta con espera controlada.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  let editTimestamp = 0;
  const startTimestamp = Date.now();

  const fakeStatusMessage = {
    id: "status_wait_001",
    edit: async (payload) => {
      editTimestamp = Date.now();
      return { id: "status_wait_001", ...payload };
    },
  };

  const fakeMessage = {
    client: {
      user: {
        id: "bot_123",
        username: "Hoshiko",
        displayAvatarURL: () => "https://example.com/avatar.png",
      },
    },
    reply: async () => ({ id: "reply_003" }),
  };

  try {
    // Usamos 150ms en unit test para no ralentizar la suite pero validar que esperó
    await sendConversationReply(
      fakeMessage,
      "sys_inst",
      [{ role: "user", parts: [{ text: "Hola" }] }],
      true,
      "standard",
      "neko",
      false,
      0.7,
      fakeStatusMessage,
      150, // minWaitMs
      "default",
    );

    const elapsed = editTimestamp - startTimestamp;
    assert.ok(elapsed >= 140, `Debe esperar al menos 140ms (esperó: ${elapsed}ms)`);
  } finally {
    geminiService.generateResponseStream = origGenerate;
  }
});

test("Universal Grounding: isResearchQuery clasifica consultas de actualidad, deportes y tecnología", () => {
  // Deportes y partidos
  assert.equal(isResearchQuery("Que sucedio en el ultimo partido de Boca Juniors"), true);
  assert.equal(isResearchQuery("resultado del partido de boca"), true);
  assert.equal(isResearchQuery("como salio boca ayer"), true);
  assert.equal(isResearchQuery("contra quien juega River este fin de semana"), true);

  // Noticias, política y eventos globales
  assert.equal(isResearchQuery("quién es el presidente de Francia actualmente"), true);
  assert.equal(isResearchQuery("qué se sabe de las elecciones en Estados Unidos"), true);
  assert.equal(isResearchQuery("se cayó el servidor de Discord hoy"), true);

  // Tecnología y lanzamientos
  assert.equal(isResearchQuery("qué pasó con la nueva versión de React"), true);
  assert.equal(isResearchQuery("cuándo sale la actualización de iOS"), true);

  // Conversación casual debe ser false
  assert.equal(isResearchQuery("hola Hoshiko, ¿qué tal tu día?"), false);
  assert.equal(isResearchQuery("buenas noches que descanses mucho"), false);
  assert.equal(isResearchQuery("cuéntame un chiste divertido"), false);
});

test("Universal Grounding: SystemPrompts incluye protocolo de verificación de hechos y cotejo multi-fuente", () => {
  const config = { prefix: "x", aiSystem: { mode: "neko", behavior: "normal" } };
  const prompt = SystemPrompts.getInstruction(config, { currentUsername: "UserTest" });

  assert.ok(prompt.includes("Protocolo de verificación de actualidad en general:"));
  assert.ok(prompt.includes("Anclaje temporal:"));
  assert.ok(prompt.includes("Cotejo multi-fuente:"));
  assert.ok(prompt.includes("Duda metódica y filtro de antigüedad:"));
  assert.ok(prompt.includes("Deducción de consultas telegráficas o informales:"));
  assert.ok(prompt.includes("Diferenciación de medios en anime/manga:"));
});

test("Universal Grounding: isResearchQuery interpreta consultas telegráficas de anime, gaming, deportes y economía", () => {
  const telegraphicQueries = [
    "chainsawman 2026 estado",
    "frieren s2",
    "one piece descanso",
    "gta 6 fecha",
    "elden ring dlc requisitos",
    "switch 2 precio",
    "jujutsu kaisen final",
    "sololeveling ep 8 cuando",
    "silksong novedades",
    "argentina proximo partido",
    "demon slayer castillo infinito fecha",
    "nvidia rtx 5090 specs",
    "bleach tybw cour 3 estreno",
    "haikyuu pelicula 2 fecha",
    "black clover regreso anime",
    "hunter x hunter manga capitulo nuevo",
    "boca river ayer",
    "dolar blue compra venta",
    "bitcoin hoy cotizacion",
    "oda descanso",
    "mappa anuncio nuevo anime",
    "cuando juega boca su proximo rival",
  ];

  for (const q of telegraphicQueries) {
    assert.equal(isResearchQuery(q), true, `Consulta telegráfica debería ser true: "${q}"`);
  }

  // Verificar que expresiones puramente conversacionales sigan siendo false
  const casualQueries = [
    "hola hoshi",
    "buenas tardes que tal",
    "jajajaja xd",
    "me siento un poco cansado hoy",
    "cuentame un chiste",
    "gracias por la ayuda hoshi",
  ];

  for (const c of casualQueries) {
    assert.equal(isResearchQuery(c), false, `Consulta casual debería ser false: "${c}"`);
  }
});
