import { existsSync } from "fs";
import path from "path";

let canvasLib: any = null;
try {
  canvasLib = require("@napi-rs/canvas");
} catch {}

function resolveAssetPath(relPath: string): string {
  const local = path.join(__dirname, "../..", relPath);
  if (existsSync(local)) return local;
  const appSrc = path.join(process.cwd(), "apps/hoshiko/src", relPath);
  if (existsSync(appSrc)) return appSrc;
  const appDist = path.join(process.cwd(), "apps/hoshiko/dist", relPath);
  if (existsSync(appDist)) return appDist;
  return local;
}

const BG_PATH = resolveAssetPath(
  "assets/images/banners/level-banners/bg-banner-1.jpg",
);
const FONT_DIR = resolveAssetPath("assets/fonts") + path.sep;

function resolveFontPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) return candidate;
    } else {
      const resolved = resolveAssetPath(candidate);
      if (existsSync(resolved)) return resolved;
    }
  }
  return null;
}

export const FONT_STACK =
  '"BannerBold","BannerReg","NotoSansCJK","NotoSansCJKBold","NotoSymbols","NotoSymbols2","NotoMath","NerdFont","NotoColorEmoji",sans-serif';

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

export interface CardThemePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  type: "image" | "gradient";
  imagePath?: string;
  colors?: [string, string, string];
  accentGlow?: string;
}

export const LEVEL_CARD_THEMES: Record<string, CardThemePreset> = {
  default: {
    id: "default",
    name: "Hoshiko Clásico",
    emoji: "🌸",
    description: "El fondo clásico estelar de Hoshiko.",
    type: "image",
    imagePath: BG_PATH,
  },
  sakura: {
    id: "sakura",
    name: "Brisa Sakura",
    emoji: "🌺",
    description: "Atardecer rosado suave con destellos florales.",
    type: "gradient",
    colors: ["#2A0E2E", "#5C1D4A", "#9E3668"],
    accentGlow: "rgba(255,183,197,0.22)",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neón Nocturno",
    emoji: "⚡",
    description: "Contraste synthwave violeta y cian profundo.",
    type: "gradient",
    colors: ["#09061E", "#240B4C", "#0D4A6B"],
    accentGlow: "rgba(103,232,249,0.22)",
  },
  midnight: {
    id: "midnight",
    name: "Medianoche",
    emoji: "🌙",
    description: "Minimalista oscuro en tonos índigo y obsidiana.",
    type: "gradient",
    colors: ["#070913", "#111827", "#1E1B4B"],
    accentGlow: "rgba(165,180,252,0.18)",
  },
  emerald: {
    id: "emerald",
    name: "Bosque Místico",
    emoji: "🍃",
    description: "Tonos esmeralda oscuros y serenos.",
    type: "gradient",
    colors: ["#051B16", "#0B382D", "#134E4A"],
    accentGlow: "rgba(110,231,183,0.18)",
  },
  sunset: {
    id: "sunset",
    name: "Crepúsculo Ámbar",
    emoji: "🌅",
    description: "Degradado cálido entre carmesí y dorado.",
    type: "gradient",
    colors: ["#1F0A1D", "#4A1525", "#7C2D12"],
    accentGlow: "rgba(251,191,36,0.20)",
  },
};

export function resolveCardBackgroundTheme(themeId?: string | null): CardThemePreset {
  if (!themeId) return LEVEL_CARD_THEMES.default;
  return LEVEL_CARD_THEMES[themeId] ?? LEVEL_CARD_THEMES.default;
}

let fontsOk = false;
const cachedImages = new Map<string, any>();

export function getCanvasLibrary(): any {
  return canvasLib;
}

export async function createBaseCanvas(
  avatarBuffer: Buffer,
  backgroundTheme?: string,
  avatarRingColor?: string,
  customBackgroundBuffer?: Buffer | null,
): Promise<{
  canvas: any;
  ctx: any;
}> {
  const { createCanvas, loadImage, GlobalFonts } = canvasLib;
  registerFonts(GlobalFonts);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const preset = resolveCardBackgroundTheme(backgroundTheme);

  let avatar: any = null;
  try {
    if (avatarBuffer && avatarBuffer.length > 0) {
      avatar = await loadImage(avatarBuffer);
    }
  } catch {
    avatar = null;
  }
  if (!avatar) {
    const dummy = createCanvas(128, 128);
    const dctx = dummy.getContext("2d");
    dctx.fillStyle = "#A855F7";
    dctx.beginPath();
    dctx.arc(64, 64, 64, 0, Math.PI * 2);
    dctx.fill();
    avatar = dummy;
  }

  const [bg, customBg] = await Promise.all([
    preset.type === "image" && !customBackgroundBuffer
      ? getBg(loadImage, preset.imagePath)
      : Promise.resolve(null),
    customBackgroundBuffer
      ? loadImage(customBackgroundBuffer).catch(() => null)
      : Promise.resolve(null),
  ]);

  drawBg(ctx, bg, preset, customBg);
  drawAvatar(ctx, avatar, avatarRingColor);
  return { canvas, ctx };
}

export function registerFonts(GF: any): void {
  if (fontsOk) return;

  const fontDefinitions: Array<{ candidates: string[]; family: string }> = [
    // 1. Fuentes principales del proyecto
    {
      candidates: [
        path.join(FONT_DIR, "Nunito-Bold.ttf"),
        "assets/fonts/Nunito-Bold.ttf",
      ],
      family: "BannerBold",
    },
    {
      candidates: [
        path.join(FONT_DIR, "Nunito-Regular.ttf"),
        "assets/fonts/Nunito-Regular.ttf",
      ],
      family: "BannerReg",
    },
    // 2. Emojis a color
    {
      candidates: [
        path.join(FONT_DIR, "NotoColorEmoji.ttf"),
        "assets/fonts/NotoColorEmoji.ttf",
        "/usr/share/fonts/twemoji/twemoji.ttf",
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
      ],
      family: "NotoColorEmoji",
    },
    // 3. Letras japonesas, chinas y coreanas (CJK)
    {
      candidates: [
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
      ],
      family: "NotoSansCJK",
    },
    {
      candidates: [
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
      ],
      family: "NotoSansCJKBold",
    },
    // 4. Símbolos raros, astrológicos, runas, dados, naipes y misceláneos
    {
      candidates: [
        "/usr/share/fonts/noto/NotoSansSymbols-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansSymbols-Regular.ttf",
      ],
      family: "NotoSymbols",
    },
    {
      candidates: [
        "/usr/share/fonts/noto/NotoSansSymbols2-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
      ],
      family: "NotoSymbols2",
    },
    // 5. Matemáticas y operadores lógicos
    {
      candidates: [
        "/usr/share/fonts/noto/NotoSansMath-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansMath-Regular.ttf",
      ],
      family: "NotoMath",
    },
    // 6. Nerd Font (iconos por código, devicons, terminal, flechas y glifos dev)
    {
      candidates: [
        "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf",
        "/usr/share/fonts/nerd-fonts/JetBrainsMonoNerdFont-Regular.ttf",
      ],
      family: "NerdFont",
    },
  ];

  for (const item of fontDefinitions) {
    const resolvedPath = resolveFontPath(item.candidates);
    if (resolvedPath) {
      try {
        GF.registerFromPath(resolvedPath, item.family);
      } catch (err: any) {
        console.warn(`[LevelBanners] Fallo al registrar ${item.family} desde ${resolvedPath}:`, err?.message);
      }
    }
  }

  fontsOk = true;
}

export async function getBg(loadImage: any, imagePath: string = BG_PATH): Promise<any> {
  if (cachedImages.has(imagePath)) return cachedImages.get(imagePath);
  try {
    const img = await loadImage(imagePath);
    cachedImages.set(imagePath, img);
    return img;
  } catch {
    if (imagePath !== BG_PATH) {
      return getBg(loadImage, BG_PATH);
    }
    return null;
  }
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
  for (let px = startPx; px >= minPx; px -= 2) {
    ctx.font = `${weight} ${px}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxW) return { font: ctx.font, text };
  }
  ctx.font = `${weight} ${minPx}px ${FONT_STACK}`;
  let fitted = text;
  while (fitted.length > 1 && ctx.measureText(fitted + "…").width > maxW) {
    fitted = fitted.slice(0, -1);
  }
  return { font: ctx.font, text: fitted + "…" };
}

export function font(px: number, weight = "normal"): string {
  return `${weight} ${px}px ${FONT_STACK}`;
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

export function drawBg(
  ctx: any,
  bg: any,
  preset: CardThemePreset = LEVEL_CARD_THEMES.default,
  customBg?: any,
): void {
  if (customBg) {
    const cw = W;
    const ch = H;
    const iw = customBg.width || W;
    const ih = customBg.height || H;
    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgRatio > canvasRatio) {
      sw = ih * canvasRatio;
      sx = (iw - sw) / 2;
    } else {
      sh = iw / canvasRatio;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(customBg, sx, sy, sw, sh, 0, 0, cw, ch);

    // Overlay oscuro para garantizar contraste y legibilidad con cualquier fondo
    ctx.fillStyle = "rgba(10, 6, 22, 0.45)";
    ctx.fillRect(0, 0, W, H);
  } else if (preset.type === "gradient" && preset.colors) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, preset.colors[0]);
    grad.addColorStop(0.55, preset.colors[1]);
    grad.addColorStop(1, preset.colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (preset.accentGlow) {
      const glow = ctx.createRadialGradient(W * 0.78, H * 0.25, 10, W * 0.78, H * 0.25, 280);
      glow.addColorStop(0, preset.accentGlow);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (bg) {
    ctx.drawImage(bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#120924";
    ctx.fillRect(0, 0, W, H);
  }

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

  // Borde sutil frosted glassmorphism alrededor de la tarjeta
  ctx.save();
  rrPath(ctx, 4, 4, W - 8, H - 8, 20);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawAvatar(ctx: any, img: any, ringColor = "rgba(232,213,255,0.92)"): void {
  const { x, y, r } = L.av;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = ringColor;
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
  ctx.font = font(topLine.length > 3 ? 24 : 34, "bold");
  ctx.fillText(topLine, cx, y + 50);
  noShadow(ctx);

  ctx.fillStyle = C.lavFaded;
  const midFontSize = midLine.length > 8 ? 10 : 12;
  ctx.font = font(midFontSize, "bold");
  ctx.fillText(midLine.toUpperCase(), cx, y + 76);

  const btmFontSize = bottomLine.length > 8 ? 10 : 12;
  ctx.font = font(btmFontSize, "bold");
  ctx.fillText(bottomLine.toUpperCase(), cx, y + 96);
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
