const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const geminiService = require(path.join(buildDir, "Services/gemini.js"));
const { sendConversationReply } = require(path.join(buildDir, "Features/ai/conversationReply.js"));
const { isAiMessage } = require(path.join(buildDir, "Features/ai/adminMessageTracker.js"));

test("Google Search: esquema correcto { googleSearch: {} } y ausencia de googleSearchRetrieval", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let capturedTools = null;

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    capturedTools = tools;
    return (async function* () {
      yield {
        text: () => "Respuesta directa con búsqueda activa.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    const fakeMessage = {
      id: "msg-search-1",
      reply: async (text) => ({ id: "reply-1", content: text }),
    };

    await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");

    assert.ok(capturedTools, "Debe enviar tools para interacción directa");
    assert.deepEqual(capturedTools, [{ googleSearch: {} }], "Debe usar { googleSearch: {} }");
    assert.equal("googleSearchRetrieval" in capturedTools[0], false, "NO debe contener googleSearchRetrieval");
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});

test("Google Search: sanitizeToolsForGemini25 sanitiza herramientas legadas eliminando googleSearchRetrieval", () => {
  assert.equal(typeof geminiService.sanitizeToolsForGemini25, "function");

  // Entrada undefined / vacía
  assert.equal(geminiService.sanitizeToolsForGemini25(undefined), undefined);
  assert.equal(geminiService.sanitizeToolsForGemini25([]), undefined);

  // Herramienta correcta se conserva
  const modern = [{ googleSearch: {} }];
  assert.deepEqual(geminiService.sanitizeToolsForGemini25(modern), [{ googleSearch: {} }]);

  // Herramienta obsoleta googleSearchRetrieval se reemplaza por googleSearch
  const legacy = [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" } } }];
  const sanitized = geminiService.sanitizeToolsForGemini25(legacy);
  assert.deepEqual(sanitized, [{ googleSearch: {} }]);
  assert.equal("googleSearchRetrieval" in sanitized[0], false);
});

test("Google Search: interacción no directa no envía herramientas de búsqueda", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let capturedTools = null;

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    capturedTools = tools;
    return (async function* () {
      yield {
        text: () => "Respuesta ambiental sin búsqueda.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    const fakeMessage = {
      id: "msg-no-direct",
      reply: async (text) => ({ id: "reply-2", content: text }),
    };

    await sendConversationReply(fakeMessage, "sys_inst", [], false, "standard");

    assert.deepEqual(capturedTools, [], "Interacción no directa debe tener tools vacías");
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});

test("Google Search: degradación limpia a texto puro ante error HTTP 400 sin bucles de reintento", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let calls = [];

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    calls.push({ tools });
    if (tools && tools.length > 0) {
      const err = new Error("400: google_search_retrieval is not supported. Please use google_search tool instead.");
      err.status = 400;
      err.statusText = "Bad Request";
      throw err;
    }
    return (async function* () {
      yield {
        text: () => "Respuesta recuperada tras fallback de texto puro.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    let replyText = "";
    let replyId = "";
    const fakeMessage = {
      id: "msg-400-err",
      reply: async (text) => {
        replyText = text;
        replyId = "bot-reply-400";
        return { id: replyId, content: text };
      },
    };

    const result = await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");

    // Exactamente 2 llamadas: 1 con tool, 1 degradada sin tool. CERO bucles inútiles.
    assert.equal(calls.length, 2, "Debe ejecutar exactamente 1 intento con tools y 1 de fallback");
    assert.deepEqual(calls[0].tools, [{ googleSearch: {} }]);
    assert.deepEqual(calls[1].tools, []);

    // El contenido corresponde a la respuesta de fallback
    assert.match(replyText, /Respuesta recuperada tras fallback de texto puro/);
    assert.equal(result.fullText, "Respuesta recuperada tras fallback de texto puro.");

    // Se registró en el tracker como mensaje legítimo de IA
    assert.equal(isAiMessage(replyId), true);
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});

test("Google Search: error no recuperable en fallback sin herramientas propaga la excepción de inmediato", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let calls = [];

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    calls.push({ tools });
    if (tools && tools.length > 0) {
      const err = new Error("Tool search error");
      err.status = 400;
      throw err;
    }
    // La degradación a texto puro también falla (por ejemplo 503 servicio no disponible)
    const fatalErr = new Error("Service Unavailable");
    fatalErr.status = 503;
    throw fatalErr;
  };

  try {
    const fakeMessage = {
      id: "msg-fatal-err",
      reply: async () => {},
    };

    await assert.rejects(
      async () => {
        await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");
      },
      (err) => err.status === 503 && err.message === "Service Unavailable",
      "Debe propagar el error del fallback sin entrar en bucle",
    );

    // Exactamente 2 llamadas, sin bucle infinito
    assert.equal(calls.length, 2);
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});

test("Google Search: recuperación normal en búsquedas posteriores tras fallo previo", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let callCount = 0;
  let shouldFailFirst = true;

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    callCount++;
    if (shouldFailFirst && tools && tools.length > 0) {
      const err = new Error("Temporary search tool failure");
      err.status = 500;
      throw err;
    }
    return (async function* () {
      yield {
        text: () => shouldFailFirst ? "Fallback exitoso." : "Búsqueda exitosa recuperada.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    const fakeMessage1 = {
      id: "msg-call-1",
      reply: async (text) => ({ id: "reply-call-1", content: text }),
    };

    // Primera llamada falla la herramienta y hace fallback (2 llamadas)
    await sendConversationReply(fakeMessage1, "sys_inst", [], true, "standard");
    assert.equal(callCount, 2);

    // Segunda interacción: el servicio de búsqueda se recuperó
    shouldFailFirst = false;
    callCount = 0;

    const fakeMessage2 = {
      id: "msg-call-2",
      reply: async (text) => ({ id: "reply-call-2", content: text }),
    };

    const res2 = await sendConversationReply(fakeMessage2, "sys_inst", [], true, "standard");
    // Debe tener éxito a la primera llamada con tools, sin fallback
    assert.equal(callCount, 1, "La llamada subsiguiente exitosa debe completarse en 1 intento");
    assert.equal(res2.fullText, "Búsqueda exitosa recuperada.");
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});

test("Google Search: preservación de fuentes y metadatos de grounding cuando el SDK los retorna", async () => {
  const originalGenerate = geminiService.generateResponseStream;

  const mockGroundingMetadata = {
    webSearchQueries: ["últimas noticias de exploración espacial", "misión artemis"],
    groundingChunks: [
      {
        web: {
          uri: "https://www.nasa.gov/news",
          title: "NASA Latest News",
        },
      },
      {
        web: {
          uri: "https://www.esa.int/space",
          title: "ESA Space Exploration",
        },
      },
    ],
  };

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    return (async function* () {
      yield {
        text: () => "Según fuentes recientes de exploración espacial...",
        candidates: [
          {
            finishReason: "STOP",
            groundingMetadata: mockGroundingMetadata,
          },
        ],
      };
    })();
  };

  try {
    let sentText = "";
    const fakeMessage = {
      id: "msg-grounding",
      reply: async (text) => {
        sentText = text;
        return { id: "reply-grounding", content: text };
      },
    };

    const result = await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");

    assert.equal(sentText, "Según fuentes recientes de exploración espacial...");
    assert.ok(result.groundingMetadata, "Debe preservar el objeto groundingMetadata");
    assert.deepEqual(
      result.groundingMetadata.webSearchQueries,
      ["últimas noticias de exploración espacial", "misión artemis"],
      "Debe preservar las consultas de búsqueda web",
    );
    assert.equal(result.groundingMetadata.groundingChunks.length, 2);
    assert.equal(result.groundingMetadata.groundingChunks[0].web.uri, "https://www.nasa.gov/news");
    assert.equal(result.groundingMetadata.groundingChunks[0].web.title, "NASA Latest News");
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});
