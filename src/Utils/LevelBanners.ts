import { AttachmentBuilder } from "discord.js";
import path from "path";
import { GLOBAL_TIERS } from "../Models/GlobalLevel";

let canvasLib: any = null;
try {
  canvasLib = require("@napi-rs/canvas");
} catch {}

// ─── Rutas ────────────────────────────────────────────────────────────────────
const BG_PATH = path.join(
  process.cwd(),
  "src/assets/images/banners/level-banners/bg-banner-1.jpg",
);
const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/");

// ─── Dimensiones ─────────────────────────────────────────────────────────────
const W = 900,
  H = 300;

// ─── Layout ───────────────────────────────────────────────────────────────────
const L = {
  av: { x: 84, y: 150, r: 72 },
  info: { x: 182, maxRight: 730 },
  usernameY: 88,
  levelY: 128,
  subY: 158, // línea extra (global badge / servidor name)
  barY: 175,
  barH: 22,
  barR: 11,
  xpY: 215,
  statsY: 248,
  panel: { x: 772, y: 28, w: 108, h: 134, r: 20 },
};

// ─── Colores ─────────────────────────────────────────────────────────────────
const C = {
  white: "#FFFFFF",
  lav: "#E8D5FF",
  lavFaded: "rgba(232,213,255,0.80)",
  muted: "rgba(232,213,255,0.65)",
  gold: "#FFD700",
  goldGlow: "rgba(255,215,0,0.20)",
  cyan: "#67E8F9",
  cyanGlow: "rgba(103,232,249,0.20)",
  glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.13)",
  progressBg: "rgba(255,255,255,0.16)",
  progressEdge: "rgba(255,255,255,0.08)",
  shadow: "rgba(0,0,0,0.40)",
};

// ─── Cache ───────────────────────────────────────────────────────────────────
let _fontsOk = false;
let _cachedBg: any = null;

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface ServerRankData {
  username: string;
  avatarBuffer: Buffer;
  level: number;
  rank: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  messagesSent: number;
  globalLevel?: number;
  globalRank?: number;
}

export interface VCRankData {
  username: string;
  avatarBuffer: Buffer;
  voiceLevel: number;
  vcRank: number;
  voiceMinutes: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
}

export interface GlobalRankData {
  username: string;
  avatarBuffer: Buffer;
  globalLevel: number;
  globalRank: number;
  totalUsers: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  tier: (typeof GLOBAL_TIERS)[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function rrPath(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + R);
  ctx.lineTo(x + w, y + h - R);
  ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
  ctx.lineTo(x + R, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - R);
  ctx.lineTo(x, y + R);
  ctx.quadraticCurveTo(x, y, x + R, y);
  ctx.closePath();
}

function fitText(
  ctx: any,
  text: string,
  maxW: number,
  startPx: number,
  minPx = 18,
  weight = "bold",
): { font: string; text: string } {
  const stack = '"BannerBold","BannerReg","Noto",sans-serif';
  for (let px = startPx; px >= minPx; px -= 2) {
    ctx.font = `${weight} ${px}px ${stack}`;
    if (ctx.measureText(text).width <= maxW) return { font: ctx.font, text };
  }
  ctx.font = `${weight} ${minPx}px ${stack}`;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW)
    t = t.slice(0, -1);
  return { font: ctx.font, text: t + "…" };
}

function f(px: number, weight = "normal") {
  return `${weight} ${px}px "BannerBold","BannerReg","Noto",sans-serif`;
}

function sh(ctx: any, blur = 10, color = C.shadow) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
}
function nosh(ctx: any) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function registerFonts(GF: any) {
  if (_fontsOk) return;
  const fonts = [
    { file: "Nunito-Bold.ttf", family: "BannerBold" },
    { file: "Nunito-Regular.ttf", family: "BannerReg" },
    { file: "NotoSans-Regular.ttf", family: "Noto" },
  ];
  for (const fnt of fonts) {
    try {
      GF.registerFromPath(path.join(FONT_DIR, fnt.file), fnt.family);
    } catch {
      console.warn(`[LevelBanners] Font missing: ${fnt.file}`);
    }
  }
  _fontsOk = true;
}

async function getBg(loadImage: any) {
  if (!_cachedBg) _cachedBg = await loadImage(BG_PATH);
  return _cachedBg;
}

function drawBg(ctx: any, bg: any) {
  ctx.drawImage(bg, 0, 0, W, H);
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(10,6,22,0.18)");
  ov.addColorStop(1, "rgba(20,8,40,0.58)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, W, H);
  const lg = ctx.createLinearGradient(0, 0, 520, 0);
  lg.addColorStop(0, "rgba(8,4,18,0.52)");
  lg.addColorStop(0.65, "rgba(8,4,18,0.10)");
  lg.addColorStop(1, "rgba(8,4,18,0.00)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, 520, H);
}

function drawAvatar(ctx: any, img: any) {
  const { x, y, r } = L.av;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(232,213,255,0.92)";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,10,40,0.55)";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function drawPanel(
  ctx: any,
  topLine: string,
  midLine: string,
  bottomLine: string,
  glowColor: string,
) {
  const { x, y, w, h, r } = L.panel;
  const cx = x + w / 2;
  ctx.save();
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = C.glass;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.glassBorder;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 26;
  rrPath(ctx, x + 2, y + 2, w - 4, h - 4, r - 2);
  ctx.strokeStyle = glowColor.replace("0.20)", "0.10)");
  ctx.lineWidth = 1;
  ctx.stroke();
  nosh(ctx);
  ctx.restore();

  ctx.textAlign = "center";
  sh(ctx, 14, glowColor);
  ctx.fillStyle =
    topLine.startsWith("#") && !topLine.startsWith("#0") ? C.gold : C.lav;
  ctx.font = f(topLine.length > 3 ? 26 : 36, "bold");
  ctx.fillText(topLine, cx, y + 52);
  nosh(ctx);
  ctx.fillStyle = C.lavFaded;
  ctx.font = f(13, "normal");
  ctx.fillText(midLine, cx, y + 76);
  ctx.fillText(bottomLine, cx, y + 94);
  ctx.textAlign = "left";
}

function drawBar(ctx: any, pct: number, gradStart: string, gradEnd: string) {
  const bx = L.info.x,
    by = L.barY;
  const bw = L.panel.x - L.info.x - 18;
  const bh = L.barH,
    br = L.barR;
  rrPath(ctx, bx, by, bw, bh, br);
  ctx.fillStyle = C.progressBg;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.progressEdge;
  ctx.stroke();
  const fw = Math.max(br * 2, Math.floor((clamp(pct, 0, 100) / 100) * bw));
  if (fw > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + fw, 0);
    g.addColorStop(0, gradStart);
    g.addColorStop(1, gradEnd);
    ctx.save();
    rrPath(ctx, bx, by, fw, bh, br);
    ctx.fillStyle = g;
    ctx.fill();
    const shine = ctx.createLinearGradient(bx, by, bx, by + bh);
    shine.addColorStop(0, "rgba(255,255,255,0.26)");
    shine.addColorStop(0.5, "rgba(255,255,255,0.00)");
    rrPath(ctx, bx, by, fw, bh, br);
    ctx.fillStyle = shine;
    ctx.fill();
    ctx.restore();
  }
}

export async function generateServerRankBanner(
  data: ServerRankData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;
    registerFonts(GlobalFonts);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [bg, av] = await Promise.all([
      getBg(loadImage),
      loadImage(data.avatarBuffer),
    ]);

    drawBg(ctx, bg);
    drawAvatar(ctx, av);

    drawPanel(ctx, `#${data.rank}`, "en el", "servidor", C.goldGlow);

    const maxW = L.info.maxRight - L.info.x;
    const { font: unFont, text: unText } = fitText(
      ctx,
      data.username,
      maxW,
      34,
      20,
      "bold",
    );
    sh(ctx, 12);
    ctx.fillStyle = C.white;
    ctx.font = unFont;
    ctx.textAlign = "left";
    ctx.fillText(unText, L.info.x, L.usernameY);
    nosh(ctx);

    ctx.fillStyle = C.lav;
    ctx.font = f(25, "normal");
    ctx.fillText(`Nivel ${data.level}`, L.info.x, L.levelY);

    if (data.globalLevel !== undefined) {
      ctx.fillStyle = C.muted;
      ctx.font = f(15, "normal");
      const globalText = data.globalRank
        ? `Global Lv.${data.globalLevel}  ·  #${data.globalRank} global`
        : `Global Lv.${data.globalLevel}`;
      ctx.fillText(globalText, L.info.x, L.subY);
    }

    drawBar(ctx, data.progressPercent, "#A855F7", "#E879F9");

    ctx.fillStyle = C.muted;
    ctx.font = f(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    ctx.fillStyle = C.muted;
    ctx.font = f(14, "normal");
    ctx.fillText(
      `💬 ${data.messagesSent.toLocaleString()} mensajes`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "server-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateServerRankBanner:", err);
    return null;
  }
}

export async function generateVCRankBanner(
  data: VCRankData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;
    registerFonts(GlobalFonts);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [bg, av] = await Promise.all([
      getBg(loadImage),
      loadImage(data.avatarBuffer),
    ]);

    drawBg(ctx, bg);
    drawAvatar(ctx, av);
    drawPanel(ctx, `#${data.vcRank}`, "en voz", "servidor", C.cyanGlow);

    const maxW = L.info.maxRight - L.info.x;
    const { font: unFont, text: unText } = fitText(
      ctx,
      data.username,
      maxW,
      34,
      20,
      "bold",
    );
    sh(ctx, 12);
    ctx.fillStyle = C.white;
    ctx.font = unFont;
    ctx.textAlign = "left";
    ctx.fillText(unText, L.info.x, L.usernameY);
    nosh(ctx);

    ctx.fillStyle = C.cyan;
    ctx.font = f(25, "normal");
    ctx.fillText(`Nivel Voz ${data.voiceLevel}`, L.info.x, L.levelY);

    const hrs = Math.floor(data.voiceMinutes / 60);
    const mins = data.voiceMinutes % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m en voz` : `${mins}m en voz`;
    ctx.fillStyle = C.muted;
    ctx.font = f(15, "normal");
    ctx.fillText(timeStr, L.info.x, L.subY);

    drawBar(ctx, data.progressPercent, "#06B6D4", "#38BDF8");

    ctx.fillStyle = C.muted;
    ctx.font = f(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP Voz  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    ctx.fillStyle = C.muted;
    ctx.font = f(14, "normal");
    ctx.fillText(
      `🎙️ ${data.voiceMinutes.toLocaleString()} minutos totales`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "vc-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateVCRankBanner:", err);
    return null;
  }
}

export async function generateGlobalRankBanner(
  data: GlobalRankData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;
    registerFonts(GlobalFonts);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const [bg, av] = await Promise.all([
      getBg(loadImage),
      loadImage(data.avatarBuffer),
    ]);

    drawBg(ctx, bg);
    drawAvatar(ctx, av);

    const tierColor = `rgba(${hexToRgb(data.tier.color)},0.22)`;
    drawPanel(
      ctx,
      `#${data.globalRank}`,
      "global",
      `/${data.totalUsers.toLocaleString()}`,
      tierColor,
    );

    const maxW = L.info.maxRight - L.info.x;
    const { font: unFont, text: unText } = fitText(
      ctx,
      data.username,
      maxW,
      34,
      20,
      "bold",
    );
    sh(ctx, 12);
    ctx.fillStyle = C.white;
    ctx.font = unFont;
    ctx.textAlign = "left";
    ctx.fillText(unText, L.info.x, L.usernameY);
    nosh(ctx);

    ctx.fillStyle = C.lav;
    ctx.font = f(25, "normal");
    ctx.fillText(`Nivel Global ${data.globalLevel}`, L.info.x, L.levelY);

    ctx.fillStyle = C.muted;
    ctx.font = f(15, "normal");
    ctx.fillText(
      `${data.tier.emoji}  ${data.tier.name}  ·  ${data.tier.nameJp}`,
      L.info.x,
      L.subY,
    );

    const tierHex = `#${data.tier.color.toString(16).padStart(6, "0")}`;
    drawBar(ctx, data.progressPercent, tierHex, lighten(tierHex, 40));

    ctx.fillStyle = C.muted;
    ctx.font = f(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP Global  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    const hrs = Math.floor(data.totalVoiceMinutes / 60);
    ctx.fillStyle = C.muted;
    ctx.font = f(14, "normal");
    ctx.fillText(
      `💬 ${data.totalMessages.toLocaleString()} msgs  ·  🎙️ ${hrs}h en voz`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "global-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateGlobalRankBanner:", err);
    return null;
  }
}

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `${r},${g},${b}`;
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amount);
  const g = Math.min(255, ((n >> 8) & 255) + amount);
  const b = Math.min(255, (n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export { generateServerRankBanner as generateRankBanner };
