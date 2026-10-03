import path from "path";

let canvasLib: any = null;
try {
  canvasLib = require("@napi-rs/canvas");
} catch {}

const BG_PATH = path.join(
  process.cwd(),
  "src/assets/images/banners/level-banners/bg-banner-1.jpg",
);
const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/");
const NOTO_CJK_DIR = "/usr/share/fonts/opentype/noto/";

export const W = 900;
export const H = 300;

export const L = {
  av: { x: 84, y: 150, r: 72 },
  info: { x: 182, maxRight: 730 },
  usernameY: 88,
  levelY: 128,
  subY: 158,
  barY: 175,
  barH: 22,
  barR: 11,
  xpY: 215,
  statsY: 248,
  panel: { x: 772, y: 28, w: 108, h: 134, r: 20 },
};

export const C = {
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

let fontsOk = false;
let cachedBg: any = null;

export function getCanvasLibrary(): any {
  return canvasLib;
}

export async function createBaseCanvas(avatarBuffer: Buffer): Promise<{
  canvas: any;
  ctx: any;
}> {
  const { createCanvas, loadImage, GlobalFonts } = canvasLib;
  registerFonts(GlobalFonts);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const [bg, avatar] = await Promise.all([
    getBg(loadImage),
    loadImage(avatarBuffer),
  ]);

  drawBg(ctx, bg);
  drawAvatar(ctx, avatar);
  return { canvas, ctx };
}

export function registerFonts(GF: any): void {
  if (fontsOk) return;

  const fonts = [
    { file: "Nunito-Bold.ttf", family: "BannerBold", dir: FONT_DIR },
    { file: "Nunito-Regular.ttf", family: "BannerReg", dir: FONT_DIR },
    {
      file: "NotoColorEmoji.ttf",
      family: "NotoColorEmoji",
      dir: "/usr/share/fonts/truetype/noto/",
    },
  ];
  for (const font of fonts) {
    try {
      GF.registerFromPath(path.join(font.dir, font.file), font.family);
    } catch {
      console.warn(`[LevelBanners] Font missing: ${font.file}`);
    }
  }

  const cjkFonts = [
    { file: "NotoSansCJK-Regular.ttc", family: "NotoSansCJK" },
    { file: "NotoSansCJK-Bold.ttc", family: "NotoSansCJK" },
  ];
  for (const font of cjkFonts) {
    try {
      GF.registerFromPath(path.join(NOTO_CJK_DIR, font.file), font.family);
    } catch {
      console.warn(`[LevelBanners] CJK font missing: ${font.file}`);
    }
  }

  fontsOk = true;
}

export async function getBg(loadImage: any): Promise<any> {
  if (!cachedBg) cachedBg = await loadImage(BG_PATH);
  return cachedBg;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function rrPath(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fitText(
  ctx: any,
  text: string,
  maxW: number,
  startPx: number,
  minPx = 18,
  weight = "bold",
): { font: string; text: string } {
  const stack = '"BannerBold","BannerReg","NotoSansCJK","NotoColorEmoji",sans-serif';
  for (let px = startPx; px >= minPx; px -= 2) {
    ctx.font = `${weight} ${px}px ${stack}`;
    if (ctx.measureText(text).width <= maxW) return { font: ctx.font, text };
  }
  ctx.font = `${weight} ${minPx}px ${stack}`;
  let fitted = text;
  while (fitted.length > 1 && ctx.measureText(fitted + "…").width > maxW) {
    fitted = fitted.slice(0, -1);
  }
  return { font: ctx.font, text: fitted + "…" };
}

export function font(px: number, weight = "normal"): string {
  return `${weight} ${px}px "BannerBold","BannerReg","NotoSansCJK","NotoColorEmoji",sans-serif`;
}

export function shadow(ctx: any, blur = 10, color = C.shadow): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
}

export function noShadow(ctx: any): void {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function drawBg(ctx: any, bg: any): void {
  ctx.drawImage(bg, 0, 0, W, H);
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, "rgba(10,6,22,0.18)");
  overlay.addColorStop(1, "rgba(20,8,40,0.58)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);
  const linear = ctx.createLinearGradient(0, 0, 520, 0);
  linear.addColorStop(0, "rgba(8,4,18,0.52)");
  linear.addColorStop(0.65, "rgba(8,4,18,0.10)");
  linear.addColorStop(1, "rgba(8,4,18,0.00)");
  ctx.fillStyle = linear;
  ctx.fillRect(0, 0, 520, H);
}

export function drawAvatar(ctx: any, img: any): void {
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

export function drawPanel(
  ctx: any,
  topLine: string,
  midLine: string,
  bottomLine: string,
  glowColor: string,
): void {
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
  noShadow(ctx);
  ctx.restore();

  ctx.textAlign = "center";
  shadow(ctx, 14, glowColor);
  ctx.fillStyle = topLine.startsWith("#") && !topLine.startsWith("#0") ? C.gold : C.lav;
  ctx.font = font(topLine.length > 3 ? 26 : 36, "bold");
  ctx.fillText(topLine, cx, y + 52);
  noShadow(ctx);
  ctx.fillStyle = C.lavFaded;
  ctx.font = font(13, "normal");
  ctx.fillText(midLine, cx, y + 76);
  ctx.fillText(bottomLine, cx, y + 94);
  ctx.textAlign = "left";
}

export function drawBar(
  ctx: any,
  pct: number,
  gradStart: string,
  gradEnd: string,
): void {
  const bx = L.info.x;
  const by = L.barY;
  const bw = L.panel.x - L.info.x - 18;
  const bh = L.barH;
  const br = L.barR;
  rrPath(ctx, bx, by, bw, bh, br);
  ctx.fillStyle = C.progressBg;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.progressEdge;
  ctx.stroke();
  const fw = Math.max(br * 2, Math.floor((clamp(pct, 0, 100) / 100) * bw));
  if (fw > 0) {
    const gradient = ctx.createLinearGradient(bx, 0, bx + fw, 0);
    gradient.addColorStop(0, gradStart);
    gradient.addColorStop(1, gradEnd);
    ctx.save();
    rrPath(ctx, bx, by, fw, bh, br);
    ctx.fillStyle = gradient;
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
