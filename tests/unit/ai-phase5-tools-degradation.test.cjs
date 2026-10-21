const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const geminiService = require(path.join(buildDir, "Services/gemini.js"));
const { sendConversationReply } = require(path.join(buildDir, "Features/ai/conversationReply.js"));

test("Fase 5: sendConversationReply degrada a texto puro si falla llamada con herramientas", async () => {
  const originalGenerate = geminiService.generateResponseStream;
  let calls = [];

  geminiService.generateResponseStream = async (systemInstruction, history, safety, tools) => {
    calls.push({ tools });
    if (tools && tools.length > 0) {
      throw new Error("Tool googleSearchRetrieval not supported for model");
    }
    // Stream mockeado exitoso
    return (async function* () {
      yield {
        text: () => "Respuesta recuperada tras fallback.",
        candidates: [{ finishReason: "STOP" }],
      };
    })();
  };

  try {
    let replyContent = "";
    const fakeMessage = {
      reply: async (text) => {
        replyContent = text;
      },
    };

    await sendConversationReply(fakeMessage, "sys_inst", [], true, "standard");

    assert.equal(calls.length, 2, "Debe intentar primero con tools y luego hacer fallback sin tools");
    assert.deepEqual(calls[0].tools, [{ googleSearchRetrieval: {} }]);
    assert.deepEqual(calls[1].tools, []);
    assert.match(replyContent, /Respuesta recuperada tras fallback/);
  } finally {
    geminiService.generateResponseStream = originalGenerate;
  }
});
