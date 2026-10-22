const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { handleCommands } = require(path.join(buildDir, "Events/Client/handlers/command.js"));
const { safeRespond, handleCommandError } = require(path.join(buildDir, "Events/Client/handlers/utils.js"));
const {
  judgeMessageWithAi,
  recordAiFailure,
  recordAiSuccess,
  resetCircuitBreaker,
  isCircuitBreakerOpen,
  CIRCUIT_THRESHOLD,
  CIRCUIT_COOLDOWN_MS,
} = require(path.join(buildDir, "Features/automod/aiJudge.js"));

// Mock factory de interacción Discord
function createMockInteraction(options = {}) {
  const replyCalls = [];
  const deferReplyCalls = [];
  const editReplyCalls = [];
  const followUpCalls = [];
  const showModalCalls = [];

  const ix = {
    id: options.id || `ix_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    commandName: options.commandName || "testcmd",
    createdTimestamp: options.createdTimestamp || Date.now(),
    guild: options.guild !== undefined ? options.guild : { id: "guild_123", name: "Servidor Test" },
    channel: options.channel || { id: "ch_123", name: "general" },
    user: options.user || { id: "user_456", username: "tester" },
    member: options.member || {},
    deferred: false,
    replied: false,
    ephemeral: false,

    async deferReply(opts = {}) {
      deferReplyCalls.push(opts);
      if (this.deferred || this.replied) {
        const err = new Error("The reply to this interaction has already been sent or deferred.");
        err.code = "InteractionAlreadyReplied";
        throw err;
      }
      this.deferred = true;
      if (opts.flags || opts.ephemeral) this.ephemeral = true;
      return { id: "msg_deferred" };
    },

    async reply(payload) {
      replyCalls.push(payload);
      if (this.deferred || this.replied) {
        const err = new Error("The reply to this interaction has already been sent or deferred.");
        err.code = "InteractionAlreadyReplied";
        throw err;
      }
      this.replied = true;
      return { id: "msg_replied", payload };
    },

    async editReply(payload) {
      editReplyCalls.push(payload);
      if (!this.deferred && !this.replied) {
        const err = new Error("The reply to this interaction has not been sent or deferred.");
        err.code = "InteractionNotReplied";
        throw err;
      }
      this.replied = true;
      return { id: "msg_edited", payload };
    },

    async followUp(payload) {
      followUpCalls.push(payload);
      return { id: "msg_followup", payload };
    },

    async showModal(modal) {
      showModalCalls.push(modal);
      if (this.deferred || this.replied) {
        const err = new Error("Interaction has already been acknowledged.");
        err.code = 40060;
        throw err;
      }
      return true;
    },

    async fetchReply() {
      return { id: "msg_fetched" };
    },

    _inspect: () => ({
      replyCalls,
      deferReplyCalls,
      editReplyCalls,
      followUpCalls,
      showModalCalls,
    }),
  };

  return ix;
}

// Mock de HoshikoClient
function createMockClient(commands = {}) {
  const slashCommands = new Map();
  for (const [name, cmd] of Object.entries(commands)) {
    slashCommands.set(name, cmd);
  }
  return {
    slashCommands,
    cooldowns: new Map(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CICLO DE VIDA DE INTERACCIONES Y REGRESIÓN InteractionAlreadyReplied
// ─────────────────────────────────────────────────────────────────────────────

test("Ciclo de vida: comando estándar auto-diferido responde exactamente una vez vía editReply", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "ping" },
    async execute(ix) {
      executed = true;
      await ix.editReply({ content: "🏓 Pong!" });
    },
  };

  const client = createMockClient({ ping: mockCmd });
  const ix = createMockInteraction({ commandName: "ping" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, true, "El comando debe ejecutarse");
  assert.equal(calls.deferReplyCalls.length, 1, "Debe ser auto-diferido por handleCommands");
  assert.equal(calls.editReplyCalls.length, 1, "Debe editar el mensaje diferido");
  assert.equal(calls.replyCalls.length, 0, "No debe invocar reply() directo");
  assert.equal(ix.replied, true);
});

test("H-01 / H-02: comando auto-diferido que erróneamente llama a deferReply() no arroja InteractionAlreadyReplied", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "avatars" },
    async execute(ix) {
      executed = true;
      // Intento accidental de re-defer Reply en el comando
      await ix.deferReply();
      await ix.editReply({ content: "🖼️ Avatares mostrados" });
    },
  };

  const client = createMockClient({ avatars: mockCmd });
  const ix = createMockInteraction({ commandName: "avatars" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, true);
  assert.equal(calls.editReplyCalls.length, 1);
  assert.equal(calls.editReplyCalls[0].content, "🖼️ Avatares mostrados");
});

test("H-01 / H-02: comando auto-diferido que llama a reply() se adapta limpiamente a editReply() sin romper", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "reglas" },
    async execute(ix) {
      executed = true;
      // Intento accidental de reply directo tras auto-defer
      await ix.reply({ content: "📜 Reglas del servidor" });
    },
  };

  const client = createMockClient({ reglas: mockCmd });
  const ix = createMockInteraction({ commandName: "reglas" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, true);
  // El adaptador debe transformar reply() en editReply()
  assert.equal(calls.editReplyCalls.length, 1);
  assert.equal(calls.editReplyCalls[0].content, "📜 Reglas del servidor");
  assert.equal(ix.replied, true);
});

test("Ciclo de vida: comando con defer:false no es diferido y responde directamente con showModal()", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "confess" },
    defer: false,
    async execute(ix) {
      executed = true;
      await ix.showModal({ customId: "confessionModal" });
    },
  };

  const client = createMockClient({ confess: mockCmd });
  const ix = createMockInteraction({ commandName: "confess" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, true);
  assert.equal(calls.deferReplyCalls.length, 0, "No debe diferir comandos con defer: false");
  assert.equal(calls.showModalCalls.length, 1, "Debe abrir el modal con éxito");
});

test("Ciclo de vida: comando con defer:false puede llamar a reply() directamente", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "quickcmd" },
    defer: false,
    async execute(ix) {
      executed = true;
      await ix.reply({ content: "⚡ Respuesta instantánea" });
    },
  };

  const client = createMockClient({ quickcmd: mockCmd });
  const ix = createMockInteraction({ commandName: "quickcmd" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, true);
  assert.equal(calls.deferReplyCalls.length, 0);
  assert.equal(calls.replyCalls.length, 1);
  assert.equal(calls.replyCalls[0].content, "⚡ Respuesta instantánea");
  assert.equal(ix.replied, true);
});

test("Manejo de errores: excepción en comando auto-diferido notifica vía editReply sin arrojar excepciones no controladas", async () => {
  const mockCmd = {
    data: { name: "failing_cmd" },
    async execute() {
      throw new Error("Fallo en base de datos de prueba");
    },
  };

  const client = createMockClient({ failing_cmd: mockCmd });
  const ix = createMockInteraction({ commandName: "failing_cmd" });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(calls.deferReplyCalls.length, 1);
  assert.equal(calls.editReplyCalls.length, 1, "handleCommandError debe editar el reply diferido con mensaje de error");
  assert.match(calls.editReplyCalls[0].content, /Algo se rompió dentro de mí/);
});

test("Manejo de errores: safeRespond realiza followUp si la interacción ya fue respondida previamente", async () => {
  const ix = createMockInteraction();
  await ix.deferReply();
  await ix.editReply({ content: "Respuesta inicial completada" });

  assert.equal(ix.replied, true);

  await safeRespond(ix, { content: "Mensaje complementario", ephemeral: true });

  const calls = ix._inspect();
  assert.equal(calls.followUpCalls.length, 1, "Debe enviar followUp cuando replied es true");
  assert.equal(calls.followUpCalls[0].content, "Mensaje complementario");
});

test("Restricciones: interacciones fuera de servidor son rechazadas con respuesta efímera", async () => {
  let executed = false;
  const mockCmd = {
    data: { name: "guildonly" },
    async execute() { executed = true; },
  };

  const client = createMockClient({ guildonly: mockCmd });
  const ix = createMockInteraction({ commandName: "guildonly", guild: null });

  await handleCommands(ix, client);

  const calls = ix._inspect();
  assert.equal(executed, false, "No debe ejecutar comandos en DM");
  assert.equal(calls.replyCalls.length, 1);
  assert.match(calls.replyCalls[0].content, /solo funcionan dentro de un servidor/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTOMOD AI JUDGE & CIRCUIT BREAKER (H-03)
// ─────────────────────────────────────────────────────────────────────────────

test("H-03: judgeMessageWithAi degrada a regex local sin abrir el circuit breaker cuando falta API key", async () => {
  resetCircuitBreaker();
  assert.equal(isCircuitBreakerOpen(), false);

  const savedModKey = process.env.GEMINI_MODERATION_API_KEY;
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODERATION_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const res = await judgeMessageWithAi({
      guildId: "guild_nobrk_test",
      content: "discord.gg/scam_free_nitro_giveaway",
      authorContext: { accountAgeDays: 1, joinAgeHours: 1 },
      channelContext: [],
      serverRules: [],
      fingerprint: "scam_no_key_test",
    });

    assert.equal(res.fallbackRegex, true, "Debe recurrir a regex local");
    assert.equal(res.verdict.verdict, "toxic", "Regex detecta scam");
    assert.equal(isCircuitBreakerOpen(), false, "El circuit breaker NO debe abrirse por falta de clave de configuración");
  } finally {
    if (savedModKey) process.env.GEMINI_MODERATION_API_KEY = savedModKey;
    if (savedKey) process.env.GEMINI_API_KEY = savedKey;
  }
});

test("H-03: Circuit Breaker se abre tras CIRCUIT_THRESHOLD fallos consecutivos y se recupera tras cooldown", async () => {
  resetCircuitBreaker();
  const t0 = 1000000;

  assert.equal(isCircuitBreakerOpen(t0), false);

  // Fallo 1 y 2
  recordAiFailure(t0);
  assert.equal(isCircuitBreakerOpen(t0), false);
  recordAiFailure(t0);
  assert.equal(isCircuitBreakerOpen(t0), false);

  // Fallo 3 (umbral alcanzado)
  recordAiFailure(t0);
  assert.equal(isCircuitBreakerOpen(t0), true, "Debe estar abierto inmediatamente tras 3 fallos");

  // Durante la ventana de enfriamiento (4 minutos)
  assert.equal(isCircuitBreakerOpen(t0 + 4 * 60 * 1000), true);

  // Cooldown cumplido (5 minutos y 1 segundo)
  const probeTime = t0 + CIRCUIT_COOLDOWN_MS + 1000;
  assert.equal(isCircuitBreakerOpen(probeTime), false, "Debe entrar en estado half-open / cerrado para permitir prueba");

  // Si la llamada de prueba tiene éxito, se resetea por completo
  recordAiSuccess();
  assert.equal(isCircuitBreakerOpen(probeTime), false);
});

test("H-03: judgeMessageWithAi con mockRunner exitoso valida veredicto y no activa fallback", async () => {
  resetCircuitBreaker();

  const mockPayload = JSON.stringify({
    verdict: "ok",
    confidence: 0.98,
    rule_id: null,
    reason: "Conversación amigable de bienvenida",
    suggested_action: "none",
  });

  const res = await judgeMessageWithAi({
    guildId: "guild_mock_succ",
    content: "¡Hola a todos, bienvenidos!",
    authorContext: { accountAgeDays: 10, joinAgeHours: 5 },
    channelContext: [],
    serverRules: [],
    fingerprint: "saludo_amigable",
    mockRunner: async () => mockPayload,
  });

  assert.equal(res.fallbackRegex, false);
  assert.equal(res.verdict.verdict, "ok");
  assert.equal(res.verdict.confidence, 0.98);
  assert.equal(isCircuitBreakerOpen(), false);
});
