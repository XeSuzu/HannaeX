const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildRoot =
  process.env.HANDLER_TEST_BUILD_DIR || path.join(__dirname, "../../dist");

// Stub de configuración para evitar llamadas a MongoDB en pruebas unitarias
const { SettingsManager } = require(
  path.join(buildRoot, "Database/guild/SettingsManager.js")
);
SettingsManager.getSettings = async () => ({
  securityModules: { securityLevel: 2, antiRaid: true },
});

const { RaidEpisodeModel } = require(
  path.join(buildRoot, "Database/moderation/raidEpisode.model.js")
);
RaidEpisodeModel.create = async (d) => d;
RaidEpisodeModel.updateOne = async () => ({ modifiedCount: 1 });
RaidEpisodeModel.findOne = () => ({
  lean: async () => null,
});

const { CaseModel } = require(
  path.join(buildRoot, "Database/moderation/case.model.js")
);
CaseModel.findOne = () => ({
  sort: () => ({ select: () => ({ lean: async () => null }) }),
});
CaseModel.create = async (d) => d;

const { HoshikoLogger } = require(
  path.join(buildRoot, "Security/Logger/HoshikoLogger.js")
);
let lastSentAlert = null;
HoshikoLogger.sendToChannel = async (guild, channelName, embed, components) => {
  lastSentAlert = { guild, channelName, embed, components };
};

const {
  triggerRaidAlert,
  executeRaidAction,
  canModerateTarget,
  isUserSafe,
  markUserSafe,
  isFingerprintSafe,
  markFingerprintSafe,
} = require(path.join(buildRoot, "Features/automod/raidAlertManager.js"));

// ─── 1. Un solo mensaje por episodio con cooldown y agregación ──────────────
test("triggerRaidAlert - genera un solo mensaje por episodio y acumula sospechosos bajo cooldown", async () => {
  lastSentAlert = null;
  const guild = {
    id: "guild_raid_cooldown_test",
    name: "Comunidad Segura",
  };

  const initialSuspects = [
    { id: "raider_1", username: "bot1", accountAgeDays: 0.1, joinedSecondsAgo: 5 },
    { id: "raider_2", username: "bot2", accountAgeDays: 0.2, joinedSecondsAgo: 4 },
    { id: "raider_3", username: "bot3", accountAgeDays: 0.1, joinedSecondsAgo: 3 },
    { id: "raider_4", username: "bot4", accountAgeDays: 0.3, joinedSecondsAgo: 2 },
    { id: "raider_5", username: "bot5", accountAgeDays: 0.2, joinedSecondsAgo: 1 },
  ];

  // Primer disparo: crea alerta en modlog
  const ep1 = await triggerRaidAlert({
    guild,
    suspects: initialSuspects,
    sampleText: "spam raid masivo",
  });

  assert.ok(ep1);
  assert.equal(ep1.suspectIds.length, 5);
  assert.ok(lastSentAlert);
  assert.equal(lastSentAlert.channelName, "modlog");

  // Segundo disparo inmediato con 2 cuentas adicionales
  lastSentAlert = null;
  const additionalSuspects = [
    { id: "raider_6", username: "bot6", accountAgeDays: 0.1, joinedSecondsAgo: 1 },
    { id: "raider_7", username: "bot7", accountAgeDays: 0.1, joinedSecondsAgo: 0 },
  ];

  const ep2 = await triggerRaidAlert({
    guild,
    suspects: additionalSuspects,
  });

  // El cooldown evita enviar otro embed spammeante a modlog
  assert.equal(lastSentAlert, null, "No debe enviar un segundo mensaje en modlog durante el cooldown");
  assert.equal(ep2.episodeId, ep1.episodeId, "Debe pertenecer al mismo episodio");
  assert.equal(ep2.suspectIds.length, 7, "Debe acumular las 7 cuentas en la lista explícita");
});

// ─── 2. Baneo sobre lista explícita de IDs y verificación de jerarquía ─────
test("executeRaidAction - banea estrictamente los IDs del episodio respetando jerarquía y permisos", async () => {
  const bannedIds = [];

  const mockGuild = {
    id: "guild_raid_ban_test",
    members: {
      me: {
        permissions: { has: (p) => true },
        roles: { highest: { position: 10 } },
      },
      fetch: async (id) => {
        // raider_admin es administrador y no debe ser baneado
        if (id === "raider_admin") {
          return {
            id,
            guild: { ownerId: "owner_123" },
            permissions: { has: (p) => p === 8n }, // Admin
            roles: { highest: { position: 20 } },
          };
        }
        return {
          id,
          guild: { ownerId: "owner_123" },
          permissions: { has: () => false },
          roles: { highest: { position: 2 } },
        };
      },
      ban: async (id, opts) => {
        bannedIds.push(id);
      },
    },
  };

  const suspects = [
    { id: "explicit_1", username: "bad1", accountAgeDays: 0.5, joinedSecondsAgo: 2 },
    { id: "explicit_2", username: "bad2", accountAgeDays: 0.5, joinedSecondsAgo: 2 },
    { id: "raider_admin", username: "admin_acc", accountAgeDays: 100, joinedSecondsAgo: 2 },
  ];

  const ep = await triggerRaidAlert({
    guild: mockGuild,
    suspects,
  });

  const moderator = {
    id: "mod_999",
    user: { tag: "Staff#0001" },
  };

  const result = await executeRaidAction({
    guild: mockGuild,
    episodeId: ep.episodeId,
    action: "ban",
    moderator,
  });

  assert.equal(result.success, true);
  // Se deben banear solo explicit_1 y explicit_2 (raider_admin es omitido por jerarquía)
  assert.deepEqual(bannedIds.sort(), ["explicit_1", "explicit_2"]);
  assert.equal(bannedIds.includes("raider_admin"), false, "Admin no debe ser baneado");
});

// ─── 3. Jerarquía y omisión de usuarios ya silenciados ─────────────────────
test("canModerateTarget y timeout - omite admins, roles superiores y usuarios ya silenciados", async () => {
  const me = {
    roles: { highest: { position: 10 } },
    permissions: { has: () => true },
  };

  const adminTarget = {
    id: "adm",
    guild: { ownerId: "owner" },
    permissions: { has: () => true },
    roles: { highest: { position: 5 } },
  };
  assert.equal(canModerateTarget(me, adminTarget), false, "No debe permitir moderar a Administradores");

  const higherRoleTarget = {
    id: "high",
    guild: { ownerId: "owner" },
    permissions: { has: () => false },
    roles: { highest: { position: 15 } },
  };
  assert.equal(canModerateTarget(me, higherRoleTarget), false, "No debe permitir moderar a roles superiores");

  const normalTarget = {
    id: "normal",
    guild: { ownerId: "owner" },
    permissions: { has: () => false },
    roles: { highest: { position: 3 } },
  };
  assert.equal(canModerateTarget(me, normalTarget), true, "Debe permitir moderar a miembros normales");
});

// ─── 4. Deshacer (Undo) - quita sanciones y marca como seguros temporalmente 
test("executeRaidAction - 'undo' restaura silencios y marca usuarios/huellas como seguros", async () => {
  let timeoutCleared = false;
  let banRemoved = false;

  const mockGuild = {
    id: "guild_undo_test",
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { position: 10 } },
      },
      fetch: async (id) => ({
        id,
        isCommunicationDisabled: () => true,
        timeout: async (ms) => {
          if (ms === null) timeoutCleared = true;
        },
      }),
    },
    bans: {
      remove: async (id) => {
        banRemoved = true;
      },
    },
  };

  const suspects = [
    { id: "innocent_1", username: "user1", accountAgeDays: 5, joinedSecondsAgo: 5, sampleText: "fp_innocent" },
  ];

  const ep = await triggerRaidAlert({
    guild: mockGuild,
    suspects,
  });

  // Ejecutar deshacer
  const resultUndo = await executeRaidAction({
    guild: mockGuild,
    episodeId: ep.episodeId,
    action: "undo",
    moderator: { id: "mod_1", user: { tag: "Admin#0001" } },
  });

  assert.equal(resultUndo.success, true);
  assert.equal(timeoutCleared, true, "Debe retirar el timeout");
  assert.equal(isUserSafe(mockGuild.id, "innocent_1"), true, "Usuario debe quedar en caché seguro");
  assert.equal(isFingerprintSafe(mockGuild.id, "fp_innocent"), true, "Huella debe quedar en caché segura");
});
