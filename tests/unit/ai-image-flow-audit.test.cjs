const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { VisualTagParser } = require(path.join(buildDir, "Core/AI/Media/VisualTagParser.js"));
const { ContextualImageService } = require(path.join(buildDir, "Core/AI/Media/ContextualImageService.js"));
const { ImageValidator } = require(path.join(buildDir, "Core/AI/Media/ImageValidator.js"));
const { EmbedComposer } = require(path.join(buildDir, "Core/AI/Presentation/EmbedComposer.js"));
const { SearchService } = require(path.join(buildDir, "Services/search.js"));
const geminiService = require(path.join(buildDir, "Services/gemini.js"));
const {
  sendConversationReply,
  neutralizeFalseVisualClaims,
} = require(path.join(buildDir, "Features/ai/conversationReply.js"));

// ============================================================================
// 1. CASOS QUE SÍ DEBEN INCLUIR IMAGEN (DECISIÓN Y FLUJO COMPLETO)
// ============================================================================

test("Auditoría Imágenes - Casos positivos: 4 consultas visuales obligatorias activan búsqueda y adjuntan imagen en embed", async () => {
  const positivePrompts = [
    {
      prompt: "Muéstrame una fotografía de la nebulosa de Orión y explícame qué estoy viendo",
      expectedTermRegex: /nebulosa de ori[oó]n/i,
      tagFromModel: '[VISUAL_SEARCH: "orion nebula hubble"]',
    },
    {
      prompt: "Enséñame una imagen de una aurora boreal",
      expectedTermRegex: /aurora boreal/i,
      tagFromModel: '[VISUAL_SEARCH: "aurora boreal"]',
    },
    {
      prompt: "Muéstrame las diferencias visuales entre un zorro ártico y uno rojo",
      expectedTermRegex: /zorro [aá]rtico y uno rojo/i,
      tagFromModel: '[VISUAL_SEARCH: "arctic fox vs red fox"]',
    },
    {
      prompt: "Quiero ver el aspecto de un agujero negro",
      expectedTermRegex: /agujero negro/i,
      tagFromModel: '[VISUAL_SEARCH: "black hole event horizon"]',
    },
  ];

  // A. Validar decisión determinista shouldSearchImage sobre los 4 prompts
  for (const item of positivePrompts) {
    const decision = ContextualImageService.shouldSearchImage(item.prompt);
    assert.equal(
      decision.eligible,
      true,
      `El prompt visual "${item.prompt}" debe ser elegible para imagen`,
    );
    assert.match(
      decision.query,
      item.expectedTermRegex,
      `La query extraída "${decision.query}" debe contener el término clave esperado`,
    );
    assert.equal(
      /expl[ií]came|mu[eé]strame|ense[ñn]ame|quiero ver/i.test(decision.query),
      false,
      `La query limpia "${decision.query}" no debe arrastrar verbos conversacionales`,
    );
  }

  // B. Validar flujo extremo a extremo en sendConversationReply (con tag del modelo y sin tag del modelo)
  const origSearch = SearchService.searchImages;
  const origValidate = ImageValidator.validateImageUrl;
  const origGenerate = geminiService.generateResponseStream;

  try {
    for (const [idx, item] of positivePrompts.entries()) {
      let searchCalls = 0;
      let geminiCalls = 0;
      let capturedEmbeds = null;

      SearchService.searchImages = async (q, num, safe) => {
        searchCalls++;
        assert.equal(safe, true, "SafeSearch debe estar activo");
        return [
          {
            imageUrl: `https://upload.wikimedia.org/valid-image-${idx}.jpg`,
            link: "https://commons.wikimedia.org",
            source: "Wikimedia Commons",
            title: `Ilustración ${idx}`,
          },
        ];
      };

      ImageValidator.validateImageUrl = async (url) => ({
        valid: true,
        finalUrl: url,
        mimeType: "image/jpeg",
        contentLength: 204800,
      });

      // Subcaso 1: Modelo emite [VISUAL_SEARCH: "..."]
      // Subcaso 2: Modelo olvida emitir [VISUAL_SEARCH: "..."] pero el usuario pidió explícitamente la imagen
      const emitTag = idx % 2 === 0;
      geminiService.generateResponseStream = async () => {
        geminiCalls++;
        return (async function* () {
          yield {
            text: () =>
              `La explicación científica detallada para la consulta ${idx}.\n${emitTag ? item.tagFromModel : ""}`,
            candidates: [{ finishReason: "STOP" }],
          };
        })();
      };

      const fakeMessage = {
        id: `msg-pos-${idx}`,
        content: item.prompt,
        client: { user: { displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png" } },
        reply: async (payload) => {
          capturedEmbeds = payload.embeds;
          return { id: `reply-pos-${idx}` };
        },
      };

      const history = [{ role: "user", parts: [{ text: `[User dice]: ${item.prompt}` }] }];
      const res = await sendConversationReply(fakeMessage, "sys_inst", history, true, "standard");

      assert.equal(geminiCalls, 1, "Debe realizarse exactamente 1 llamada a Gemini (sin segundas llamadas)");
      assert.equal(searchCalls, 1, `Debe invocarse SearchService.searchImages para "${item.prompt}"`);
      assert.equal(res.fullText.includes("[VISUAL_SEARCH"), false, "El tag nunca debe filtrarse al texto final");
      assert.ok(capturedEmbeds && capturedEmbeds.length > 0, "Debe enviarse al menos 1 embed");
      assert.equal(
        capturedEmbeds[0].data.image?.url,
        `https://upload.wikimedia.org/valid-image-${idx}.jpg`,
        "El embed debe incluir la URL de la imagen validada en image.url",
      );
    }
  } finally {
    SearchService.searchImages = origSearch;
    ImageValidator.validateImageUrl = origValidate;
    geminiService.generateResponseStream = origGenerate;
  }
});

// ============================================================================
// 2. CASOS QUE NO DEBEN INCLUIR IMAGEN
// ============================================================================

test("Auditoría Imágenes - Casos negativos: 4 consultas no visuales NO disparan búsqueda de imágenes", async () => {
  const negativePrompts = [
    "¿Qué es una variable en JavaScript?",
    "Explícame cómo funciona la recursividad",
    "¿Por qué el cielo es azul?",
    "¿Qué diferencia hay entre RAM y ROM?",
  ];

  const origSearch = SearchService.searchImages;
  const origGenerate = geminiService.generateResponseStream;

  try {
    let searchCalls = 0;
    SearchService.searchImages = async () => {
      searchCalls++;
      return [];
    };

    for (const [idx, prompt] of negativePrompts.entries()) {
      // 1. Validar shouldSearchImage e isNonVisualPrompt
      const decision = ContextualImageService.shouldSearchImage(prompt);
      assert.equal(
        decision.eligible,
        false,
        `La consulta no visual "${prompt}" NO debe ser elegible para imagen`,
      );
      assert.equal(
        ContextualImageService.isNonVisualPrompt(prompt),
        true,
        `La consulta "${prompt}" debe ser identificada como no visual`,
      );

      // 2. Validar que findContextualImage devuelve null sin llamar a Serper
      const directRes = await ContextualImageService.findContextualImage(prompt);
      assert.equal(directRes, null);
      assert.equal(searchCalls, 0, `No debe llamar a SearchService para "${prompt}"`);

      // 3. Validar en sendConversationReply (incluso si el modelo alucinara un tag [VISUAL_SEARCH])
      let capturedEmbeds = null;
      geminiService.generateResponseStream = async () => {
        return (async function* () {
          yield {
            text: () => `Explicación conceptual para: ${prompt}\n[VISUAL_SEARCH: "alucinacion"]`,
            candidates: [{ finishReason: "STOP" }],
          };
        })();
      };

      const fakeMessage = {
        id: `msg-neg-${idx}`,
        content: prompt,
        reply: async (payload) => {
          capturedEmbeds = payload.embeds;
          return { id: `reply-neg-${idx}` };
        },
      };

      const history = [{ role: "user", parts: [{ text: `[User dice]: ${prompt}` }] }];
      const res = await sendConversationReply(fakeMessage, "sys_inst", history, true, "standard");

      assert.equal(searchCalls, 0, `Cero búsquedas de imagen permitidas para "${prompt}"`);
      assert.equal(res.fullText.includes("[VISUAL_SEARCH"), false);
      assert.ok(capturedEmbeds && capturedEmbeds.length > 0);
      assert.equal(capturedEmbeds[0].data.image, undefined, "El embed NO debe contener imagen");
    }
  } finally {
    SearchService.searchImages = origSearch;
    geminiService.generateResponseStream = origGenerate;
  }
});

// ============================================================================
// 3. CASOS DE ERROR Y DEGRADACIÓN ELEGANTE (6 ESCENARIOS OBLIGATORIOS)
// ============================================================================

test("Auditoría Imágenes - Error 1: Búsqueda sin resultados (array vacío o null)", async () => {
  const origSearch = SearchService.searchImages;
  try {
    SearchService.searchImages = async () => [];
    const resEmpty = await ContextualImageService.findContextualImage("orion nebula", {
      isDirectQuery: true,
    });
    assert.equal(resEmpty, null);

    SearchService.searchImages = async () => null;
    const resNull = await ContextualImageService.findContextualImage("orion nebula", {
      isDirectQuery: true,
    });
    assert.equal(resNull, null);
  } finally {
    SearchService.searchImages = origSearch;
  }
});

test("Auditoría Imágenes - Error 2: URL de imagen caída o HTTP 404 (descarta rota y selecciona siguiente candidato válido)", async () => {
  const origSearch = SearchService.searchImages;
  const origValidate = ImageValidator.validateImageUrl;
  try {
    SearchService.searchImages = async () => [
      { imageUrl: "https://example.com/broken-404.jpg", link: "https://example.com", source: "Ex1", title: "404" },
      { imageUrl: "https://example.com/working-200.jpg", link: "https://example.com", source: "Ex2", title: "OK" },
    ];

    ImageValidator.validateImageUrl = async (url) => {
      if (url.includes("broken-404")) {
        return { valid: false, reason: "Server returned HTTP 404" };
      }
      return { valid: true, finalUrl: url, mimeType: "image/jpeg", contentLength: 50000 };
    };

    const res = await ContextualImageService.findContextualImage("orion nebula", {
      isDirectQuery: true,
    });
    assert.ok(res, "Debe seleccionar el segundo candidato cuando el primero da 404");
    assert.equal(res.url, "https://example.com/working-200.jpg");

    // Si TODAS dan 404, debe devolver null sin lanzar excepción
    ImageValidator.validateImageUrl = async () => ({
      valid: false,
      reason: "Server returned HTTP 404",
    });
    const resAllDead = await ContextualImageService.findContextualImage("orion nebula", {
      isDirectQuery: true,
    });
    assert.equal(resAllDead, null);
  } finally {
    SearchService.searchImages = origSearch;
    ImageValidator.validateImageUrl = origValidate;
  }
});

test("Auditoría Imágenes - Error 3: URL con Content-Type no imagen (text/html) es rechazada", async () => {
  const origResolve = ImageValidator.resolveAndValidateHost;
  const origFetch = global.fetch;

  try {
    ImageValidator.resolveAndValidateHost = async () => ({ safe: true, ip: "93.184.216.34" });
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (name) => {
          if (name.toLowerCase() === "content-type") return "text/html; charset=utf-8";
          if (name.toLowerCase() === "content-length") return "1200";
          return null;
        },
      },
    });

    const validation = await ImageValidator.validateImageUrl("https://example.com/fake-image.jpg");
    assert.equal(validation.valid, false);
    assert.match(validation.reason, /Unsupported Content-Type: text\/html/i);
  } finally {
    ImageValidator.resolveAndValidateHost = origResolve;
    global.fetch = origFetch;
  }
});

test("Auditoría Imágenes - Error 4: Timeout o fallo del proveedor de búsqueda no rompe la respuesta textual", async () => {
  const origSearch = SearchService.searchImages;
  try {
    SearchService.searchImages = async () => {
      const err = new Error("timeout of 4000ms exceeded");
      err.code = "ECONNABORTED";
      throw err;
    };

    const res = await ContextualImageService.findContextualImage("orion nebula", {
      isDirectQuery: true,
    });
    assert.equal(res, null, "Ante un timeout, findContextualImage debe capturar el error y devolver null");
  } finally {
    SearchService.searchImages = origSearch;
  }
});

test("Auditoría Imágenes - Error 5 y 6: Cuando no se adjunta imagen (o Discord rechaza el embed con imagen), entrega respuesta textual sin afirmar falsamente 'En la imagen estás viendo / puedes ver'", async () => {
  // Validación unitaria directa de neutralizeFalseVisualClaims
  const rawFalse1 =
    "En la imagen estás viendo una vasta nube de gas y polvo interestelar conocida como M42.";
  const sanitized1 = neutralizeFalseVisualClaims(rawFalse1);
  assert.equal(/en la imagen est[aá]s viendo/i.test(sanitized1), false);
  assert.match(sanitized1, /^Se aprecia una vasta nube de gas y polvo interestelar/i);

  const rawFalse2 = "En la imagen puedes ver las estrellas del Trapecio iluminando el gas.";
  const sanitized2 = neutralizeFalseVisualClaims(rawFalse2);
  assert.equal(/en la imagen puedes ver/i.test(sanitized2), false);
  assert.match(sanitized2, /^Se aprecia las estrellas del Trapecio/i);

  // Validación en flujo completo sendConversationReply cuando falla la búsqueda de imagen
  const origSearch = SearchService.searchImages;
  const origGenerate = geminiService.generateResponseStream;

  try {
    SearchService.searchImages = async () => []; // Sin resultados -> imageResult = null
    geminiService.generateResponseStream = async () => {
      return (async function* () {
        yield {
          text: () =>
            'En la imagen estás viendo una vasta nube de gas y polvo interestelar donde nacen estrellas.\n[VISUAL_SEARCH: "orion nebula"]',
          candidates: [{ finishReason: "STOP" }],
        };
      })();
    };

    let capturedEmbeds = null;
    const fakeMessage = {
      id: "msg-fallback-text",
      content: "Muéstrame una fotografía de la nebulosa de Orión y explícame qué estoy viendo",
      reply: async (payload) => {
        capturedEmbeds = payload.embeds;
        return { id: "reply-fallback-1" };
      },
    };

    const history = [
      {
        role: "user",
        parts: [{ text: "[User dice]: Muéstrame una fotografía de la nebulosa de Orión y explícame qué estoy viendo" }],
      },
    ];

    const res = await sendConversationReply(fakeMessage, "sys_inst", history, true, "standard");

    assert.ok(capturedEmbeds && capturedEmbeds.length === 1, "Debe enviar el embed de texto");
    assert.equal(capturedEmbeds[0].data.image, undefined, "No hay imagen adjunta");
    assert.equal(
      /en la imagen (?:est[aá]s viendo|puedes ver)/i.test(res.fullText),
      false,
      "No debe afirmar falsamente 'en la imagen estás viendo / puedes ver' cuando la imagen falló",
    );
    assert.equal(
      /en la imagen (?:est[aá]s viendo|puedes ver)/i.test(capturedEmbeds[0].data.description),
      false,
      "La descripción del embed enviado a Discord tampoco debe contener la afirmación falsa",
    );
  } finally {
    SearchService.searchImages = origSearch;
    geminiService.generateResponseStream = origGenerate;
  }
});

test("Auditoría Imágenes - Fallback de Discord: Si Discord rechaza el embed con imagen, reintenta enviando el embed de texto sin perder la respuesta", async () => {
  const origSearch = SearchService.searchImages;
  const origValidate = ImageValidator.validateImageUrl;
  const origGenerate = geminiService.generateResponseStream;

  try {
    SearchService.searchImages = async () => [
      {
        imageUrl: "https://example.com/valid-head-but-discord-rejects.jpg",
        link: "https://example.com",
        source: "Example",
        title: "Nebulosa",
      },
    ];
    ImageValidator.validateImageUrl = async (url) => ({
      valid: true,
      finalUrl: url,
      mimeType: "image/jpeg",
      contentLength: 10000,
    });
    geminiService.generateResponseStream = async () => {
      return (async function* () {
        yield {
          text: () =>
            'En la imagen puedes ver la nebulosa de Orión brillando.\n[VISUAL_SEARCH: "orion nebula"]',
          candidates: [{ finishReason: "STOP" }],
        };
      })();
    };

    let replyAttempts = 0;
    let finalSentEmbeds = null;
    const fakeMessage = {
      id: "msg-discord-reject",
      content: "Muéstrame una fotografía de la nebulosa de Orión",
      reply: async (payload) => {
        replyAttempts++;
        if (payload.embeds[0].data.image) {
          throw new Error("DiscordAPIError[50035]: Invalid Form Body - embed.image.url");
        }
        finalSentEmbeds = payload.embeds;
        return { id: "reply-recovered" };
      },
    };

    const res = await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");
    assert.equal(replyAttempts, 2, "Debe reintentar el envío sin imagen tras el rechazo de Discord");
    assert.ok(finalSentEmbeds, "El segundo intento solo con texto debe entregarse con éxito");
    assert.equal(finalSentEmbeds[0].data.image, undefined);
    assert.equal(/en la imagen puedes ver/i.test(res.fullText), false);
  } finally {
    SearchService.searchImages = origSearch;
    ImageValidator.validateImageUrl = origValidate;
    geminiService.generateResponseStream = origGenerate;
  }
});
