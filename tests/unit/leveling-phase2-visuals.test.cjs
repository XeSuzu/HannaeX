const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildDir = process.env.HANDLER_TEST_BUILD_DIR || path.resolve(__dirname, "../../dist");

const { generateServerRankBanner } = require(path.join(buildDir, "Utils/levelBanners/serverRank.js"));
const { generateVCRankBanner } = require(path.join(buildDir, "Utils/levelBanners/vcRank.js"));
const leaderboardCmd = require(path.join(buildDir, "Commands/SlashCmds/Levels/leaderboard.js")).default;
const setupLevelsCmd = require(path.join(buildDir, "Commands/SlashCmds/Levels/setup-levels.js")).default;
const LocalLevel = require(path.join(buildDir, "Database/leveling/localLevel.model.js")).default;
const LevelConfig = require(path.join(buildDir, "Database/leveling/levelConfig.model.js")).default;
const { createCanvas } = require("@napi-rs/canvas");

test("Phase 2 - Canvas Rank Cards: Renderiza tarjetas duales y medallas de color de rango", async () => {
  const avCanvas = createCanvas(128, 128);
  const avCtx = avCanvas.getContext("2d");
  avCtx.fillStyle = "#FFD700";
  avCtx.fillRect(0, 0, 128, 128);
  const avatarBuffer = await avCanvas.encode("png");

  // Rank 1 con nivel de texto y voz dual
  const bannerRank1 = await generateServerRankBanner({
    username: "TopPlayer 🌸",
    avatarBuffer,
    level: 50,
    rank: 1,
    xpCurrent: 2500,
    xpNeeded: 3000,
    progressPercent: 83,
    messagesSent: 4500,
    voiceMinutes: 1200,
    voiceLevel: 25,
    backgroundTheme: "default",
  });

  assert.notEqual(bannerRank1, null);
  assert.equal(bannerRank1.name, "server-rank.png");
  assert.ok(bannerRank1.attachment.length > 5000);

  // VC Rank 1
  const vcBanner = await generateVCRankBanner({
    username: "VoiceKing 🎙️",
    avatarBuffer,
    voiceLevel: 30,
    vcRank: 1,
    voiceMinutes: 2400,
    xpCurrent: 800,
    xpNeeded: 1200,
    progressPercent: 66,
    backgroundTheme: "cyberpunk",
  });

  assert.notEqual(vcBanner, null);
  assert.equal(vcBanner.name, "vc-rank.png");
  assert.ok(vcBanner.attachment.length > 5000);
});

test("Phase 2 - Unified Leaderboard: Renderiza categorías (Texto, Voz, Semanal) con botones de alternancia", async () => {
  const guildId = "guild-lb-test";

  const origCount = LocalLevel.countDocuments;
  const origFind = LocalLevel.find;
  const origFindOne = LocalLevel.findOne;

  // Mockear datos
  LocalLevel.countDocuments = async (filter) => 5;
  LocalLevel.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: async () => [
          { userId: "u1", level: 25, xp: 5000, voiceMinutes: 600, voiceLevel: 15, voiceXp: 3000, weeklyXp: 1200, weeklyMessages: 80, weeklyVoiceMinutes: 120 },
          { userId: "u2", level: 18, xp: 3200, voiceMinutes: 450, voiceLevel: 10, voiceXp: 2100, weeklyXp: 850, weeklyMessages: 45, weeklyVoiceMinutes: 90 },
        ],
      }),
    }),
  });
  LocalLevel.findOne = async () => ({
    userId: "user-author",
    level: 10,
    xp: 1500,
    voiceMinutes: 200,
    voiceLevel: 5,
    voiceXp: 800,
    weeklyXp: 400,
    weeklyMessages: 20,
    weeklyVoiceMinutes: 45,
  });

  try {
    let editReplyPayload = null;
    const mockInteraction = {
      guildId,
      guild: {
        name: "Test Guild",
        iconURL: () => null,
        members: { cache: new Map() },
      },
      user: { id: "user-author", username: "AuthorUser" },
      options: {
        getString: (name) => (name === "categoria" ? "text" : null),
        getInteger: () => 1,
      },
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => ({ on: () => {} }),
        };
      },
    };

    const mockClient = {
      users: {
        cache: new Map([
          ["u1", { id: "u1", username: "Alice", displayName: "Alice" }],
          ["u2", { id: "u2", username: "Bob", displayName: "Bob" }],
        ]),
        fetch: async () => null,
      },
      user: { displayAvatarURL: () => null },
    };

    await leaderboardCmd.execute(mockInteraction, mockClient);

    assert.notEqual(editReplyPayload, null);
    assert.equal(Array.isArray(editReplyPayload.embeds), true);
    assert.match(editReplyPayload.embeds[0].data.title, /Leaderboard de Texto/i);

    // Debe incluir los 3 botones de categoría
    const catRow = editReplyPayload.components[0];
    assert.notEqual(catRow, undefined);
    const buttonLabels = catRow.components.map((c) => c.data.label);
    assert.ok(buttonLabels.includes("Texto"));
    assert.ok(buttonLabels.includes("Voz"));
    assert.ok(buttonLabels.includes("Semanal"));
  } finally {
    LocalLevel.countDocuments = origCount;
    LocalLevel.find = origFind;
    LocalLevel.findOne = origFindOne;
  }
});

test("Phase 2 - Interactive Setup Levels: Despliega botones de control en tiempo real", async () => {
  const guildId = "guild-setup-test";

  const origFindOneAndUpdate = LevelConfig.findOneAndUpdate;
  LevelConfig.findOneAndUpdate = async () => ({
    guildId,
    enabled: true,
    announceMode: "milestone",
    announceDM: false,
    xpVoiceEnabled: true,
    xpPerMessage: 20,
    xpCooldown: 60,
    xpMinLength: 5,
    xpMultiplier: 1.0,
    xpMentionBonus: 5,
    xpMentionMaxBonus: 25,
    xpPerMinuteVoice: 10,
    xpVoiceMinMinutes: 1,
    ignoreBots: true,
    ignoredChannels: [],
    ignoredRoles: [],
    levelRoles: [],
  });

  try {
    let editReplyPayload = null;
    const mockInteraction = {
      guildId,
      options: {
        getSubcommandGroup: () => null,
        getSubcommand: () => "view",
      },
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => ({ on: () => {} }),
        };
      },
      user: { id: "admin-user" },
    };

    await setupLevelsCmd.execute(mockInteraction, {});

    assert.notEqual(editReplyPayload, null);
    assert.match(editReplyPayload.embeds[0].data.title, /Panel Interactivo de Niveles/i);

    const buttonRow = editReplyPayload.components[0];
    assert.notEqual(buttonRow, undefined);
    const customIds = buttonRow.components.map((c) => c.data.custom_id);
    assert.ok(customIds.includes("lvl_btn_toggle"));
    assert.ok(customIds.includes("lvl_btn_voice"));
    assert.ok(customIds.includes("lvl_btn_dm"));
    assert.ok(customIds.includes("lvl_btn_cycle_mode"));
  } finally {
    LevelConfig.findOneAndUpdate = origFindOneAndUpdate;
  }
});
