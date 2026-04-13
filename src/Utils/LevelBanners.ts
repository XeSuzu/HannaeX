// ============================================
// GENERADOR DE BANNERS CON @napi-rs/canvas
// ============================================

import { AttachmentBuilder } from "discord.js";
import path from "path";
import { getTierForLevel } from "../Models/GlobalLevel";

let canvasLib: any = null;
try {
  canvasLib = require("@napi-rs/canvas");
} catch (e) {
  console.log("[LevelBanners] @napi-rs/canvas no instalado");
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

const BG_PATH = path.join(
  process.cwd(),
  "src/assets/images/banners/level-banners/bg-banner-1.jpg",
);
const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/");

// ─── Constantes ───────────────────────────────────────────────────────────────

const W = 900;
const H = 300;

/** Todos los valores de layout en un solo lugar. Cambia aquí, cambia todo. */
const L = {
  // Avatar
  av: { x: 84, y: 150, r: 72 },

  // Zona de texto/info: empieza después del avatar
  info: { x: 182, maxRight: 730 },

  // Posiciones verticales del bloque de info
  usernameY: 96,
  levelY: 135,
  barY: 165,
  barH: 24,
  barRadius: 12,
  xpY: 210,
  tierY: 245,

  // Panel derecho (rank)
  panel: { x: 772, y: 32, w: 108, h: 130, r: 20 },
};

const COLORS = {
  white: "#FFFFFF",
  lavender: "#E8D5FF",
  lavenderFaded: "rgba(232,213,255,0.85)",
  muted: "rgba(232,213,255,0.70)",
  gold: "#FFD700",
  goldGlow: "rgba(255,215,0,0.22)",
  progressBg: "rgba(255,255,255,0.18)",
  progressEdge: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.09)",
  glassBorder: "rgba(255,255,255,0.14)",
  shadow: "rgba(0,0,0,0.40)",
};

// ─── Cache de recursos ────────────────────────────────────────────────────────

let _fontsOk = false;
let _cachedBg: any = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Dibuja un rect redondeado como path (no hace fill/stroke). */
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

/** Intenta reducir tamaño de fuente hasta que el texto quepa en maxWidth.
 *  Si ni en minSize cabe, trunca con "…". */
function fitText(
  ctx: any,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx = 18,
  weight: "bold" | "normal" = "bold",
): { font: string; displayText: string } {
  const stack = '"Banner Bold", "Banner Regular", "Noto", sans-serif';
  let px = startPx;

  while (px >= minPx) {
    ctx.font = `${weight} ${px}px ${stack}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return { font: ctx.font, displayText: text };
    }
    px -= 2;
  }

  ctx.font = `${weight} ${minPx}px ${stack}`;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return { font: ctx.font, displayText: t + "…" };
}

function font(px: number, weight: "bold" | "normal" = "normal") {
  return `${weight} ${px}px "Banner Bold", "Banner Regular", "Noto", sans-serif`;
}

function shadow(ctx: any, blur = 10, color = COLORS.shadow) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
}

function noShadow(ctx: any) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ─── Registro de fuentes (una sola vez) ──────────────────────────────────────

function registerFonts(GlobalFonts: any) {
  if (_fontsOk) return;

  const fonts = [
    { file: "Nunito-Bold.ttf", family: "Banner Bold" },
    { file: "Nunito-Regular.ttf", family: "Banner Regular" },
    // Añade estos si los tienes para cubrir CJK / emoji:
    { file: "NotoSans-Regular.ttf", family: "Noto" },
    { file: "NotoColorEmoji.ttf", family: "Noto Emoji" },
  ];

  for (const f of fonts) {
    try {
      GlobalFonts.registerFromPath(path.join(FONT_DIR, f.file), f.family);
    } catch {
      console.warn(`[LevelBanners] Fuente no encontrada: ${f.file}`);
    }
  }

  _fontsOk = true;
}

async function getBg(loadImage: any) {
  if (!_cachedBg) _cachedBg = await loadImage(BG_PATH);
  return _cachedBg;
}

// ─── Capas de dibujo ──────────────────────────────────────────────────────────

function drawBg(ctx: any, bg: any) {
  ctx.drawImage(bg, 0, 0, W, H);

  // Overlay oscuro vertical (sutil)
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(10,6,22,0.18)");
  ov.addColorStop(1, "rgba(20,8,40,0.55)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, W, H);

  // Degradado lateral izquierdo para dar contraste al texto
  const lg = ctx.createLinearGradient(0, 0, 520, 0);
  lg.addColorStop(0, "rgba(8,4,18,0.50)");
  lg.addColorStop(0.6, "rgba(8,4,18,0.12)");
  lg.addColorStop(1, "rgba(8,4,18,0.00)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, 520, H);
}

function drawAvatar(ctx: any, img: any) {
  const { x, y, r } = L.av;

  // Anillo exterior brillante
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(232,213,255,0.92)";
  ctx.fill();
  ctx.restore();

  // Anillo interior de separación (oscuro)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(30,15,55,0.55)";
  ctx.fill();
  ctx.restore();

  // Clip circular para la imagen
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function drawRankPanel(ctx: any, rank: number) {
  const { x, y, w, h, r } = L.panel;
  const cx = x + w / 2;

  // Fondo glassmorphism
  ctx.save();
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = COLORS.glass;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.glassBorder;
  ctx.stroke();
  ctx.restore();

  // Glow dorado suave de fondo
  ctx.save();
  ctx.shadowColor = COLORS.goldGlow;
  ctx.shadowBlur = 28;
  rrPath(ctx, x + 2, y + 2, w - 4, h - 4, r - 2);
  ctx.strokeStyle = "rgba(255,215,0,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  noShadow(ctx);
  ctx.restore();

  // Número de rank
  ctx.textAlign = "center";
  shadow(ctx, 14, "rgba(255,180,0,0.30)");
  ctx.fillStyle = COLORS.gold;
  ctx.font = font(rank >= 100 ? 30 : 38, "bold");
  ctx.fillText(`#${rank}`, cx, y + 54);

  // Subtítulo "en el servidor"
  noShadow(ctx);
  ctx.fillStyle = COLORS.lavenderFaded;
  ctx.font = font(14, "normal");
  ctx.fillText("en el", cx, y + 80);
  ctx.fillText("servidor", cx, y + 98);
  ctx.textAlign = "left";
}

function drawInfo(ctx: any, data: RankBannerData) {
  const maxW = L.info.maxRight - L.info.x;

  // Username con ajuste de tamaño automático
  const { font: usernameFont, displayText } = fitText(
    ctx,
    data.username,
    maxW,
    34,
    20,
    "bold",
  );
  shadow(ctx, 12);
  ctx.fillStyle = COLORS.white;
  ctx.font = usernameFont;
  ctx.textAlign = "left";
  ctx.fillText(displayText, L.info.x, L.usernameY);

  // Nivel
  noShadow(ctx);
  ctx.fillStyle = COLORS.lavender;
  ctx.font = font(26, "normal");
  ctx.fillText(`Nivel ${data.level}`, L.info.x, L.levelY);
}

function drawBar(ctx: any, data: RankBannerData) {
  // El ancho de la barra va desde info.x hasta el borde del panel - margen
  const bx = L.info.x;
  const by = L.barY;
  const bw = L.panel.x - L.info.x - 20; // ← llega hasta el panel
  const bh = L.barH;
  const br = L.barRadius;
  const pct = clamp(data.progressPercent, 0, 100);

  // Track (fondo)
  rrPath(ctx, bx, by, bw, bh, br);
  ctx.fillStyle = COLORS.progressBg;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.progressEdge;
  ctx.stroke();

  // Fill (progreso)
  if (pct > 0) {
    const fw = Math.max(br * 2, Math.floor((pct / 100) * bw));
    const grad = ctx.createLinearGradient(bx, 0, bx + fw, 0);
    grad.addColorStop(0, "#A855F7");
    grad.addColorStop(1, "#E879F9");

    ctx.save();
    rrPath(ctx, bx, by, fw, bh, br);
    ctx.fillStyle = grad;
    ctx.fill();

    // Brillo interno en el fill
    const shine = ctx.createLinearGradient(bx, by, bx, by + bh);
    shine.addColorStop(0, "rgba(255,255,255,0.28)");
    shine.addColorStop(0.5, "rgba(255,255,255,0.00)");
    rrPath(ctx, bx, by, fw, bh, br);
    ctx.fillStyle = shine;
    ctx.fill();
    ctx.restore();
  }

  // Texto XP
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(18, "normal");
  ctx.textAlign = "left";
  ctx.fillText(
    `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP  (${pct}%)`,
    bx,
    L.xpY,
  );
}

function drawTierBadge(ctx: any, level: number) {
  const tier = getTierForLevel(level);
  if (!tier) return;

  const bx = L.info.x;
  const by = L.tierY - 16;
  const text = `${tier.emoji}  ${tier.name}  ·  ${tier.nameJp}`;

  ctx.font = font(15, "normal");
  const tw = ctx.measureText(text).width;
  const padX = 12;
  const padY = 7;
  const bw = tw + padX * 2;
  const bh = 26;

  // Cápsula de fondo
  rrPath(ctx, bx, by, bw, bh, 13);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.lavenderFaded;
  ctx.fillText(text, bx + padX, by + bh - padY);
}

// ─── Función principal ────────────────────────────────────────────────────────

export interface RankBannerData {
  username: string;
  avatarBuffer: Buffer;
  level: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  rank: number;
}

export async function generateRankBanner(
  data: RankBannerData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;

  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;

    registerFonts(GlobalFonts);

    // Sanitizar datos de entrada
    const d: RankBannerData = {
      username: data.username?.trim() || "Usuario",
      avatarBuffer: data.avatarBuffer,
      level: Math.max(0, data.level ?? 0),
      xpCurrent: Math.max(0, data.xpCurrent ?? 0),
      xpNeeded: Math.max(1, data.xpNeeded ?? 1),
      progressPercent: clamp(data.progressPercent ?? 0, 0, 100),
      rank: Math.max(1, data.rank ?? 1),
    };

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Cargar recursos en paralelo
    const [bg, avatarImg] = await Promise.all([
      getBg(loadImage),
      loadImage(d.avatarBuffer),
    ]);

    drawBg(ctx, bg);
    drawAvatar(ctx, avatarImg);
    drawRankPanel(ctx, d.rank);
    drawInfo(ctx, d);
    drawBar(ctx, d);
    drawTierBadge(ctx, d.level);

    const buffer = canvas.toBuffer("image/png");
    return new AttachmentBuilder(buffer, { name: "rank.png" });
  } catch (err) {
    console.error("[LevelBanners] Error generando rank banner:", err);
    return null;
  }
}
git add 