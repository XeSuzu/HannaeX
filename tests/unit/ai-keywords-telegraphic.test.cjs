const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { KeywordTaxonomy, KEYWORD_TAXONOMY, normalizeSearchToken, STOPWORDS } = require(path.join(buildDir, "Core/AI/Keywords/KeywordTaxonomy.js"));
const { DynamicKeywordRegistry } = require(path.join(buildDir, "Core/AI/Keywords/DynamicKeywordRegistry.js"));
const { KeywordIntentClassifier } = require(path.join(buildDir, "Core/AI/Keywords/KeywordIntentClassifier.js"));
const geminiService = require(path.join(buildDir, "Services/gemini.js"));
const { sendConversationReply } = require(path.join(buildDir, "Features/ai/conversationReply.js"));

test("Keywords: Taxonomía base cubre todas las categorías principales", () => {
  const categories = KEYWORD_TAXONOMY.map((g) => g.category);
  assert.ok(categories.includes("temporal"), "Debe incluir temporal");
  assert.ok(categories.includes("anime"), "Debe incluir anime");
  assert.ok(categories.includes("sports"), "Debe incluir sports");
  assert.ok(categories.includes("economy"), "Debe incluir economy");
  assert.ok(categories.includes("gaming"), "Debe incluir gaming");
  assert.ok(categories.includes("news"), "Debe incluir news");
  assert.ok(categories.includes("intent"), "Debe incluir intent");
});

test("Keywords: KeywordIntentClassifier clasifica consultas telegráficas y genera deductionHints precisos", () => {
  // Caso Anime / Manga
  const cAnime = KeywordIntentClassifier.classify("chainsawman 2026 estado");
  assert.equal(cAnime.isResearch, true);
  assert.equal(cAnime.isTelegraphic, true);
  assert.ok(cAnime.categories.includes("anime"));
  assert.ok(cAnime.deductionHint?.includes("anime/manga"));

  // Caso Deportes
  const cSports = KeywordIntentClassifier.classify("boca river ayer");
  assert.equal(cSports.isResearch, true);
  assert.equal(cSports.isTelegraphic, true);
  assert.ok(cSports.categories.includes("sports"));
  assert.ok(cSports.deductionHint?.includes("deportiva"));

  // Caso Videojuegos / Hardware
  const cGaming = KeywordIntentClassifier.classify("switch 2 precio");
  assert.equal(cGaming.isResearch, true);
  assert.equal(cGaming.isTelegraphic, true);
  assert.ok(cGaming.categories.includes("gaming") || cGaming.categories.includes("economy"));
  assert.ok(cGaming.deductionHint);

  // Caso Economía / Cripto
  const cEconomy = KeywordIntentClassifier.classify("dolar blue hoy");
  assert.equal(cEconomy.isResearch, true);
  assert.equal(cEconomy.isTelegraphic, true);
  assert.ok(cEconomy.categories.includes("economy"));
  assert.ok(cEconomy.deductionHint?.includes("cotización") || cEconomy.deductionHint?.includes("divisas"));
});

test("Keywords: KeywordIntentClassifier discrimina consultas telegráficas de preguntas formales y de charla casual", () => {
  // Telegráfica: pocas palabras, sin estructura de pregunta formal
  assert.equal(KeywordIntentClassifier.isTelegraphic("frieren s2"), true);
  assert.equal(KeywordIntentClassifier.isTelegraphic("gta 6 fecha"), true);
  assert.equal(KeywordIntentClassifier.isTelegraphic("one piece descanso"), true);

  // Pregunta formal
  assert.equal(KeywordIntentClassifier.isTelegraphic("¿Cuándo es el próximo eclipse solar en América?"), false);
  assert.equal(KeywordIntentClassifier.isTelegraphic("¿Cómo fue que empezó la Segunda Guerra Mundial?"), false);

  // Descarte de charla casual
  const cHola = KeywordIntentClassifier.classify("hola qué tal hoshi");
  assert.equal(cHola.isResearch, false);
  assert.equal(cHola.isTelegraphic, false);

  const cRisa = KeywordIntentClassifier.classify("jajajaja xd me hiciste reír");
  assert.equal(cRisa.isResearch, false);

  const cChiste = KeywordIntentClassifier.classify("cuéntame un chiste");
  assert.equal(cChiste.isResearch, false);
});

test("Keywords: DynamicKeywordRegistry aprende nuevas palabras y filtra stopwords/basura", async () => {
  const registry = DynamicKeywordRegistry.getInstance();

  // Test registro de palabras válidas
  const recorded = await registry.recordLearnedKeywords([
    "dandadan",
    "gta vi leaks",
    "de", // stopword -> debe ser filtrada
    "x",  // longitud < 3 -> debe ser filtrada
    "1234", // solo números -> debe ser filtrada
    "mierda", // palabra ofensiva -> debe ser filtrada
    "hollow knight silksong",
  ]);

  assert.ok(recorded.includes("dandadan"), "Debe registrar dandadan");
  assert.ok(recorded.includes("gta vi leaks"), "Debe registrar gta vi leaks");
  assert.ok(recorded.includes("hollow knight silksong"), "Debe registrar hollow knight silksong");
  assert.ok(!recorded.includes("de"), "NO debe registrar stopword");
  assert.ok(!recorded.includes("x"), "NO debe registrar longitud < 3");
  assert.ok(!recorded.includes("mierda"), "NO debe registrar vulgaridad");

  // Verificar presencia en memoria
  assert.equal(registry.hasLearnedKeyword("dandadan"), true);
  assert.equal(registry.hasLearnedKeyword("viste dandadan ayer"), true);
  assert.equal(registry.hasLearnedKeyword("noticia de hollow knight silksong"), true);

  // KeywordIntentClassifier debe reconocer la nueva palabra aprendida dinámicamente
  const classification = KeywordIntentClassifier.classify("dandadan estreno");
  assert.equal(classification.isResearch, true);
});

test("Embed de Espera: sendConversationReply soporta 10000ms de espera con rotación fluida", async () => {
  const origGenerate = geminiService.generateResponseStream;

  geminiService.generateResponseStream = async () => {
    return (async function* () {
      yield {
        text: () => "Respuesta completa tras 10s de análisis reflexivo.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  const editTimestamps = [];
  const fakeStatusMessage = {
    id: "status_msg_10s",
    edit: async (payload) => {
      editTimestamps.push(Date.now());
      return { id: "status_msg_10s", ...payload };
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
    reply: async () => ({ id: "reply_dummy" }),
  };

  try {
    const startTimestamp = Date.now();
    // Probamos con minWaitMs de 300ms en el test para no demorar la suite unitaria,
    // validando la lógica de rotación y retardo mínimo.
    const res = await sendConversationReply(
      fakeMessage,
      "sys_inst",
      [{ role: "user", parts: [{ text: "chainsawman 2026 estado" }] }],
      true,
      "standard",
      "neko",
      true,
      0.2,
      fakeStatusMessage,
      300, // minWaitMs en test
      "research",
    );

    const elapsed = Date.now() - startTimestamp;
    assert.ok(elapsed >= 280, `Debe respetar el tiempo mínimo (esperó: ${elapsed}ms)`);
    assert.ok(editTimestamps.length >= 1, "Debe haber editado el mensaje al finalizar");
    assert.ok(res.fullText.includes("tras 10s de análisis reflexivo"));
  } finally {
    geminiService.generateResponseStream = origGenerate;
  }
});

test("Ilusión del Trabajo: ConversationStatusManager genera 5 etapas progresivas limpias sin barras de carga", () => {
  const { ConversationStatusManager } = require(path.join(buildDir, "Core/AI/Status/ConversationStatusManager.js"));

  const botUser = {
    displayAvatarURL: () => "https://example.com/hoshiko.png",
  };

  // Verificar las 5 etapas
  assert.equal(ConversationStatusManager.RESEARCH_STEPS.length, 5);

  for (let i = 0; i < 5; i++) {
    const embed = ConversationStatusManager.createProgressiveStatusEmbed(botUser, i);
    const desc = embed.data.description;
    const footer = embed.data.footer?.text;

    // Verificar formato limpio: Título en negrita y detalle en cursiva
    assert.ok(desc.includes("**"), `La etapa ${i + 1} debe contener título en negrita`);
    assert.ok(desc.includes("*"), `La etapa ${i + 1} debe contener detalle en cursiva`);

    // Regla del usuario: CERO barras de carga
    assert.ok(!desc.includes("▰"), `La etapa ${i + 1} NO debe contener bloques ▰`);
    assert.ok(!desc.includes("▱"), `La etapa ${i + 1} NO debe contener bloques ▱`);
    assert.ok(!desc.includes("%"), `La etapa ${i + 1} NO debe contener porcentajes de barra`);

    // Verificar footer descriptivo con número de etapa
    assert.ok(footer?.includes(`Etapa ${i + 1} de 5`), `El footer debe indicar 'Etapa ${i + 1} de 5'`);
  }
});

test("Ilusión del Trabajo: Se activa únicamente para búsquedas en internet y no para charlas casuales o locales", () => {
  // Consultas que requieren búsqueda web -> deben clasificar como isResearch
  const webQueries = [
    "chainsawman 2026 estado",
    "boca river ayer",
    "frieren s2",
    "switch 2 precio",
    "dolar blue hoy",
  ];
  for (const q of webQueries) {
    const c = KeywordIntentClassifier.classify(q);
    assert.equal(c.isResearch, true, `"${q}" debe requerir búsqueda en internet`);
  }

  // Charlas casuales o consultas locales -> NO deben activar búsqueda web
  const casualQueries = [
    "hola hoshiko",
    "buenas tardes",
    "jajaja qué gracioso",
    "me gusta mucho el chocolate",
    "cuéntame un chiste",
    "gracias por todo",
  ];
  for (const c of casualQueries) {
    const res = KeywordIntentClassifier.classify(c);
    assert.equal(res.isResearch, false, `"${c}" NO debe activar búsqueda web ni embed de 10s`);
  }
});
