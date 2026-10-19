const test = require("node:test");
const assert = require("node:assert");
const { CATEGORIES, WELCOME_LINES } = require("../../dist/Commands/SlashCmds/Fun/helpUtils/config.js");
const { buildModerationEmbed } = require("../../dist/Commands/SlashCmds/Fun/helpUtils/moderationHelp.js");
const { buildAntiraidEmbed } = require("../../dist/Commands/SlashCmds/Fun/helpUtils/antiraidHelp.js");
const { CURATED_COMMAND_DETAILS, getCommandDetail } = require("../../dist/Commands/SlashCmds/Fun/helpUtils/commandDetails.js");
const { buildHelpComponents } = require("../../dist/Commands/SlashCmds/Fun/helpUtils/ui.js");

// Mock de HoshikoClient mínimo para tests de renderizado
const mockClient = {
  user: {
    id: "123456789012345678",
    displayAvatarURL: () => "https://cdn.discordapp.com/avatars/123/abc.png",
  },
  ws: { ping: 42 },
  guilds: { cache: { size: 10 } },
};

test("CATEGORIES - cubre todas las áreas principales con metadatos consistentes", () => {
  const requiredCategories = [
    "Information",
    "Moderation",
    "Confessions",
    "Utility",
    "Fun",
    "Profiles",
    "Interactions",
    "Social",
    "Canvas",
    "Setups",
  ];

  for (const cat of requiredCategories) {
    const config = CATEGORIES[cat];
    assert.ok(config, `La categoría ${cat} debe estar definida`);
    assert.ok(typeof config.emoji === "string" && config.emoji.length > 0);
    assert.ok(typeof config.desc === "string" && config.desc.length > 0);
    assert.ok(typeof config.color === "number");
  }

  assert.strictEqual(CATEGORIES["Moderation"].visibleTo, "Mod");
  assert.strictEqual(CATEGORIES["Setups"].visibleTo, "Admin");
});

test("buildModerationEmbed - documenta flujo disciplinario, jerarquía y respeta límites de Discord", () => {
  const embed = buildModerationEmbed(mockClient);
  const json = embed.toJSON();

  assert.ok(json.title.includes("Moderación"));
  assert.ok(json.description.length > 0);
  assert.ok(json.fields.length >= 4);

  // Verificación de flujo disciplinario
  const flujoField = json.fields.find((f) => f.name.includes("Flujo Disciplinario"));
  assert.ok(flujoField, "Debe existir un campo de flujo disciplinario");
  assert.ok(flujoField.value.includes("/warn"));
  assert.ok(flujoField.value.includes("/mute"));
  assert.ok(flujoField.value.includes("/kick"));
  assert.ok(flujoField.value.includes("/ban"));

  // Verificación de advertencia de jerarquía
  const hierarchyField = json.fields.find((f) => f.name.includes("Jerarquía"));
  assert.ok(hierarchyField, "Debe documentar la jerarquía de roles");

  // Límites de Discord: total chars < 6000, fields <= 25, field value <= 1024
  let totalChars = (json.title?.length || 0) + (json.description?.length || 0);
  for (const f of json.fields) {
    assert.ok(f.name.length <= 256, "Field name no debe exceder 256 chars");
    assert.ok(f.value.length <= 1024, "Field value no debe exceder 1024 chars");
    totalChars += f.name.length + f.value.length;
  }
  assert.ok(totalChars < 6000, `Total chars (${totalChars}) no debe exceder 6000`);
});

test("buildAntiraidEmbed - documenta estado BETA, capacidades reales y limitaciones técnicas", () => {
  const embed = buildAntiraidEmbed(mockClient);
  const json = embed.toJSON();

  assert.ok(json.title.includes("[BETA]"), "El título debe indicar explícitamente [BETA]");
  assert.ok(json.description.includes("Aviso de Beta en Desarrollo"), "Debe tener aviso de beta");

  // Verificación de los tres grupos solicitados
  const dispoField = json.fields.find((f) => f.name.includes("1. Capacidades Disponibles"));
  assert.ok(dispoField, "Debe listar capacidades disponibles");
  assert.ok(dispoField.value.includes("Join-Flood"));
  assert.ok(dispoField.value.includes("Anti-Nuke"));

  const limitField = json.fields.find((f) => f.name.includes("2. Limitaciones"));
  assert.ok(limitField, "Debe documentar limitaciones");
  assert.ok(limitField.value.includes("Alerta vs Acción Autónoma"));

  const evalField = json.fields.find((f) => f.name.includes("3. En Evaluación"));
  assert.ok(evalField, "Debe listar futuras mejoras en evaluación");

  const protoField = json.fields.find((f) => f.name.includes("4. Protocolo"));
  assert.ok(protoField, "Debe incluir protocolo post-incidente para administradores");
});

test("commandDetails - detalle curado contiene comandos clave de moderación y utilidades", () => {
  const coreCommands = [
    "warn",
    "warnings",
    "unwarn",
    "clearwarnings",
    "mute",
    "tempmute",
    "unmute",
    "kick",
    "softban",
    "ban",
    "tempban",
    "unban",
    "massban",
    "setup-automod",
    "setup-logs",
    "rank",
    "vcrank",
    "confess",
    "setup-confessions",
  ];

  for (const name of coreCommands) {
    const detail = CURATED_COMMAND_DETAILS[name];
    assert.ok(detail, `El comando ${name} debe tener detalles curados`);
    assert.ok(detail.purpose.length > 0);
    assert.ok(detail.syntax.startsWith("/"));
    assert.ok(Array.isArray(detail.examples) && detail.examples.length > 0);
  }

  // Verificación de comando en mantenimiento
  const globalrankDetail = CURATED_COMMAND_DETAILS["globalrank"];
  assert.strictEqual(globalrankDetail.status, "mantenimiento");
});

test("getCommandDetail - genera documentación dinámica vía introspección para comandos no curados", () => {
  const mockSlash = {
    category: "Fun",
    data: {
      toJSON: () => ({
        name: "test-cmd",
        description: "Comando de prueba inventado para introspección",
        options: [
          { name: "sub1", description: "Primer subcomando", type: 1 },
          { name: "parametro", description: "Parámetro de texto", type: 3, required: true },
        ],
        default_member_permissions: "8",
      }),
    },
  };

  const detail = getCommandDetail("test-cmd", mockSlash);
  assert.strictEqual(detail.name, "test-cmd");
  assert.strictEqual(detail.category, "Fun");
  assert.strictEqual(detail.subcommands?.length, 1);
  assert.strictEqual(detail.options?.length, 1);
  assert.ok(detail.syntax.includes("/test-cmd"));
});

test("buildHelpComponents - estructura menús y botones sin violar límites de Discord", () => {
  const mockCategorized = {
    Information: [{ name: "help", desc: "Ayuda" }],
    Moderation: [{ name: "warn", desc: "Advertir" }, { name: "mute", desc: "Silenciar" }],
    Utility: [{ name: "rank", desc: "Rango" }],
  };

  const rows = buildHelpComponents(mockClient, mockCategorized, "Moderation", mockCategorized.Moderation, 1, 1);

  // Máximo 5 ActionRows permitidas por Discord
  assert.ok(rows.length <= 5);

  // Fila 1: Menú de categorías
  const catMenu = rows[0].toJSON().components[0];
  assert.strictEqual(catMenu.type, 3); // StringSelectMenu
  assert.strictEqual(catMenu.custom_id, "help_menu");

  // Fila 2: Menú de comandos de Moderation
  const cmdMenu = rows[1].toJSON().components[0];
  assert.strictEqual(cmdMenu.type, 3);
  assert.strictEqual(cmdMenu.custom_id, "help_cmd_select");
  for (const opt of cmdMenu.options) {
    assert.notStrictEqual(opt.emoji?.name, "▸", "No debe usar el carácter tipográfico ▸ como emoji");
    assert.strictEqual(opt.emoji?.name, "🔹", "Debe usar un emoji Unicode válido como 🔹");
  }

  // Fila 3: Botonera única (cuando totalPages <= 1)
  const buttons = rows[2].toJSON().components;
  assert.ok(buttons.length >= 4 && buttons.length <= 5, "La botonera no debe exceder 5 componentes");
  assert.ok(buttons.some((b) => b.custom_id === "help_home"));
  assert.ok(buttons.some((b) => b.custom_id === "help_antiraid"));

  // Verificación de paginación con totalPages > 1 (ej: 3 páginas)
  const paginatedRows = buildHelpComponents(mockClient, mockCategorized, "Moderation", mockCategorized.Moderation, 1, 3);
  assert.ok(paginatedRows.length <= 5, "El total de ActionRows no debe exceder 5");
  for (let idx = 0; idx < paginatedRows.length; idx++) {
    const rowJson = paginatedRows[idx].toJSON();
    assert.ok(
      rowJson.components.length >= 1 && rowJson.components.length <= 5,
      `La fila ${idx} (${rowJson.components.length} componentes) debe tener entre 1 y 5 componentes`
    );
  }
});
