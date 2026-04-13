import { AttachmentBuilder } from "discord.js";
import path from "path";

let canvasLib: any = null;

try {
  canvasLib = require("@napi-rs/canvas");
} catch (e) {
  console.log("[LevelBanners] @napi-rs/canvas no instalado, usando fallback");
}

const BG_PATH = path.join(
  process.cwd(),
  "src/assets/images/banners/level-banners/bg-banner-1.jpg",
);

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/");

const BANNER = {
  width: 900,
  height: 300,
};

const LAYOUT = {
  avatarX: 88,
  avatarY: 150,
  avatarRadius: 72,

  contentX: 180,
  contentRight: 760,

  usernameY: 92,
  levelY: 130,

  barY: 162,
  barHeight: 24,
  barRadius: 12,

  xpY: 205,

  rightPanelX: 770,
  rightPanelY: 38,
  rightPanelWidth: 108,
  rightPanelHeight: 120,
  rightPanelRadius: 18,
};

const COLORS = {
  white: "#FFFFFF",
  textSoft: "#E8D5FF",
  textMuted: "rgba(232,213,255,0.9)",
  purple: "#C084FC",
  overlayTop: "rgba(14, 8, 26, 0.22)",
  overlayBottom: "rgba(24, 10, 44, 0.52)",
  leftShade: "rgba(10, 8, 20, 0.38)",
  progressBg: "rgba(255,255,255,0.18)",
  progressStroke: "rgba(255,255,255,0.08)",
  gold: "#FFD700",
  goldSoft: "rgba(255,215,0,0.18)",
  cardGlass: "rgba(255,255,255,0.08)",
  cardStroke: "rgba(255,255,255,0.12)",
  shadow: "rgba(0,0,0,0.35)",
  avatarRing: "#E8D5FF",
};

export interface RankBannerData {
  username: string;
  avatarBuffer: Buffer;
  level: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  rank: number;
}

let fontsRegistered = false;
let cachedBg: any = null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function registerFonts(GlobalFonts: any) {
  if (fontsRegistered) return;

  const fontCandidates = [
    { file: "Nunito-Bold.ttf", family: "Banner Nunito Bold" },
    { file: "Nunito-Regular.ttf", family: "Banner Nunito" },

    // Opcionales si los agregas luego:
    { file: "NotoSans-Regular.ttf", family: "Banner Noto" },
    { file: "NotoColorEmoji.ttf", family: "Banner Emoji" },
  ];

  for (const font of fontCandidates) {
    try {
      GlobalFonts.registerFromPath(path.join(FONT_DIR, font.file), font.family);
    } catch (error) {
      console.warn(`[LevelBanners] Fuente no disponible: ${font.file}`);
    }
  }

  fontsRegistered = true;
}

function getFont(size: number, weight: "normal" | "bold" = "normal") {
  const familyStack =
    '"Banner Nunito", "Banner Nunito Bold", "Banner Noto", "Banner Emoji", sans-serif';
  return `${weight} ${size}px ${familyStack}`;
}

function fitText(
  ctx: any,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 18,
  weight: "normal" | "bold" = "bold",
) {
  let size = startSize;

  while (size >= minSize) {
    ctx.font = getFont(size, weight);
    if (ctx.measureText(text).width <= maxWidth)
      return { font: ctx.font, size };
    size -= 2;
  }

  ctx.font = getFont(minSize, weight);

  let safe = text;
  while (safe.length > 0 && ctx.measureText(`${safe}…`).width > maxWidth) {
    safe = safe.slice(0, -1);
  }

  return {
    font: ctx.font,
    size: minSize,
    text: safe.length > 0 ? `${safe}…` : "User",
  };
}

function drawTextShadow(ctx: any) {
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
}

function clearShadow(ctx: any) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

async function getBackground(loadImage: any) {
  if (!cachedBg) {
    cachedBg = await loadImage(BG_PATH);
  }
  return cachedBg;
}

function drawBackground(ctx: any, bg: any) {
  ctx.drawImage(bg, 0, 0, BANNER.width, BANNER.height);

  const overlay = ctx.createLinearGradient(0, 0, 0, BANNER.height);
  overlay.addColorStop(0, COLORS.overlayTop);
  overlay.addColorStop(1, COLORS.overlayBottom);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, BANNER.width, BANNER.height);

  const leftGradient = ctx.createLinearGradient(0, 0, 480, 0);
  leftGradient.addColorStop(0, COLORS.leftShade);
  leftGradient.addColorStop(1, "rgba(10,8,20,0)");
  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, 480, BANNER.height);
}

function drawAvatar(ctx: any, avatarImg: any) {
  const { avatarX, avatarY, avatarRadius } = LAYOUT;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(232,213,255,0.95)";
  ctx.fill();
  clearShadow(ctx);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    avatarImg,
    avatarX - avatarRadius,
    avatarY - avatarRadius,
    avatarRadius * 2,
    avatarRadius * 2,
  );
  ctx.restore();
}

function drawRightPanel(ctx: any, rank: number) {
  const {
    rightPanelX,
    rightPanelY,
    rightPanelWidth,
    rightPanelHeight,
    rightPanelRadius,
  } = LAYOUT;

  ctx.save();
  roundRect(
    ctx,
    rightPanelX,
    rightPanelY,
    rightPanelWidth,
    rightPanelHeight,
    rightPanelRadius,
  );
  ctx.fillStyle = COLORS.cardGlass;
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.cardStroke;
  ctx.stroke();

  ctx.shadowColor = COLORS.goldSoft;
  ctx.shadowBlur = 22;
  roundRect(
    ctx,
    rightPanelX,
    rightPanelY,
    rightPanelWidth,
    rightPanelHeight,
    rightPanelRadius,
  );
  ctx.strokeStyle = "rgba(255,215,0,0.10)";
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";

  drawTextShadow(ctx);
  ctx.fillStyle = COLORS.gold;
  ctx.font = getFont(40, "bold");
  ctx.fillText(`#${rank}`, rightPanelX + rightPanelWidth / 2, rightPanelY + 46);

  ctx.fillStyle = COLORS.textSoft;
  ctx.font = getFont(16, "normal");
  ctx.fillText("en el", rightPanelX + rightPanelWidth / 2, rightPanelY + 74);
  ctx.fillText("servidor", rightPanelX + rightPanelWidth / 2, rightPanelY + 94);
  clearShadow(ctx);

  ctx.textAlign = "left";
}

function drawUserInfo(ctx: any, data: RankBannerData) {
  const availableWidth = LAYOUT.contentRight - LAYOUT.contentX - 18;

  const fitted = fitText(ctx, data.username, availableWidth, 34, 20, "bold");
  const usernameText = fitted.text ?? data.username;

  drawTextShadow(ctx);
  ctx.fillStyle = COLORS.white;
  ctx.font = fitted.font;
  ctx.textAlign = "left";
  ctx.fillText(usernameText, LAYOUT.contentX, LAYOUT.usernameY);

  ctx.fillStyle = COLORS.textSoft;
  ctx.font = getFont(24, "normal");
  ctx.fillText(`Nivel ${data.level}`, LAYOUT.contentX, LAYOUT.levelY);
  clearShadow(ctx);
}

function drawProgress(ctx: any, data: RankBannerData) {
  const barX = LAYOUT.contentX;
  const barY = LAYOUT.barY;
  const barWidth = LAYOUT.rightPanelX - LAYOUT.contentX - 28;
  const barHeight = LAYOUT.barHeight;
  const barRadius = LAYOUT.barRadius;

  roundRect(ctx, barX, barY, barWidth, barHeight, barRadius);
  ctx.fillStyle = COLORS.progressBg;
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.progressStroke;
  ctx.stroke();

  const safePercent = clamp(data.progressPercent, 0, 100);
  const fillWidth = Math.floor((safePercent / 100) * barWidth);

  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#A855F7");
    gradient.addColorStop(1, "#E879F9");

    ctx.save();
    roundRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = getFont(18, "normal");
  ctx.textAlign = "left";
  ctx.fillText(
    `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP  (${safePercent}%)`,
    barX,
    LAYOUT.xpY,
  );
}

export async function generateRankBanner(
  data: RankBannerData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;

  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;

    registerFonts(GlobalFonts);

    const safeData: RankBannerData = {
      ...data,
      username: data.username?.trim() || "Usuario",
      level: Math.max(0, data.level ?? 0),
      xpCurrent: Math.max(0, data.xpCurrent ?? 0),
      xpNeeded: Math.max(1, data.xpNeeded ?? 1),
      progressPercent: clamp(data.progressPercent ?? 0, 0, 100),
      rank: Math.max(1, data.rank ?? 1),
    };

    const canvas = createCanvas(BANNER.width, BANNER.height);
    const ctx = canvas.getContext("2d");

    const [bg, avatarImg] = await Promise.all([
      getBackground(loadImage),
      loadImage(safeData.avatarBuffer),
    ]);

    drawBackground(ctx, bg);
    drawAvatar(ctx, avatarImg);
    drawRightPanel(ctx, safeData.rank);
    drawUserInfo(ctx, safeData);
    drawProgress(ctx, safeData);

    const buffer = canvas.toBuffer("image/png");
    return new AttachmentBuilder(buffer, { name: "rank.png" });
  } catch (err) {
    console.error("[LevelBanners] Error generando rank banner:", err);
    return null;
  }
}
