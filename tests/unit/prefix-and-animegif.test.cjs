const assert = require("node:assert/strict");
const path = require("node:path");

async function run() {
  const distRoot = path.resolve(__dirname, "../../apps/hoshiko/dist");

  const {
    getAnimeGif,
    NEKOS_BEST_MAP,
    OTAKUGIFS_MAP,
    FALLBACK_GIFS,
    resolveInteractionColor,
    resolveInteractionTarget,
  } = require(path.join(distRoot, "Utils/animeGif"));
  const loadCommandsHandler = require(path.join(distRoot, "Handlers/cmdHandler")).default;

  const ALL_14_CATEGORIES = [
    "hug",
    "cuddle",
    "kiss",
    "poke",
    "pat",
    "slap",
    "highfive",
    "bite",
    "dance",
    "sad",
    "happy",
    "blush",
    "cry",
    "wave",
  ];

  // 1. Validar mapeos y fallbacks de las 14 acciones en animeGif.ts
  for (const cat of ALL_14_CATEGORIES) {
    assert.ok(NEKOS_BEST_MAP[cat], `Falta mapeo en NEKOS_BEST_MAP para ${cat}`);
    assert.ok(OTAKUGIFS_MAP[cat], `Falta mapeo en OTAKUGIFS_MAP para ${cat}`);
    assert.ok(
      FALLBACK_GIFS[cat] && FALLBACK_GIFS[cat].startsWith("https://"),
      `Falta fallback válido en FALLBACK_GIFS para ${cat}`,
    );
  }
  assert.equal(NEKOS_BEST_MAP.sad, "cry", "nekos.best debe mapear sad -> cry");
  assert.equal(OTAKUGIFS_MAP.highfive, "cheers", "otakugifs debe mapear highfive -> cheers");

  // 2. Validar resolveInteractionColor (ignorar #000000 de Discord sin rol con color)
  assert.equal(
    resolveInteractionColor({ displayHexColor: "#000000" }, "#f8bbd0"),
    "#f8bbd0",
  );
  assert.equal(
    resolveInteractionColor({ displayHexColor: "#ff55aa" }, "#f8bbd0"),
    "#ff55aa",
  );
  assert.equal(resolveInteractionColor(null, "#f8bbd0"), "#f8bbd0");

  // 3. Validar getAnimeGif en vivo para las 14 categorías
  for (const cat of ALL_14_CATEGORIES) {
    const gifUrl = await getAnimeGif(cat);
    assert.ok(
      typeof gifUrl === "string" && gifUrl.startsWith("https://"),
      `getAnimeGif("${cat}") devolvió URL inválida: ${gifUrl}`,
    );
    assert.ok(
      !gifUrl.includes("waifu.im") && !gifUrl.includes("7X7HPs4.gif"),
      `getAnimeGif("${cat}") usó fuente obsoleta: ${gifUrl}`,
    );
  }

  // 4. Validar carga de comandos y alias en cmdHandler
  const mockClient = {
    commands: new Map(),
    slashCommands: new Map(),
  };
  loadCommandsHandler(mockClient);

  const expectedCommands = [
    ...ALL_14_CATEGORIES,
    "activity",
    "act",
    "spotify",
    "avatar",
    "av",
    "pfp",
    "banner",
    "avatars",
    "users",
    "userinfo",
    "whois",
    "serverinfo",
    "server",
    "ping",
    "say",
    "translate",
    "prefix",
    "setprefix",
  ];

  for (const cmdName of expectedCommands) {
    assert.ok(
      mockClient.commands.has(cmdName),
      `El comando o alias "${cmdName}" debe estar registrado en client.commands`,
    );
  }

  // 5. Validar resolveInteractionTarget (mención explícita, ID en args, reply)
  const fakeUserA = { id: "111111111111111111", username: "UserA" };
  const fakeUserB = { id: "222222222222222222", username: "UserB" };
  const fakeMsg = {
    content: "hoshi pat <@222222222222222222>",
    mentions: {
      users: new Map([
        ["111111111111111111", fakeUserA],
        ["222222222222222222", fakeUserB],
      ]),
    },
    client: {
      users: {
        cache: new Map(),
        fetch: async (id) => (id === fakeUserB.id ? fakeUserB : null),
      },
    },
  };
  fakeMsg.mentions.users.first = () => fakeUserA;
  const resolvedTarget = await resolveInteractionTarget(fakeMsg, ["<@222222222222222222>"]);
  assert.equal(
    resolvedTarget.id,
    fakeUserB.id,
    "resolveInteractionTarget debe priorizar la mención explícita en el texto sobre el primer ping de reply",
  );

  console.log("✅ prefix-and-animegif.test.cjs PASSED (14 GIF categories + prefix commands + aliases)");
}

run().catch((err) => {
  console.error("❌ prefix-and-animegif.test.cjs FAILED:", err);
  process.exit(1);
});
