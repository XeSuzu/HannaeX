import {
  createCanvas,
  GlobalFonts,
  loadImage,
  SKRSContext2D,
} from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import { join } from "path";

// ─── registro de fuentes ──────────────────────────────────────────────────────
try {
  GlobalFonts.registerFromPath(
    join(process.cwd(), "src/assets/fonts/Nunito-Regular.ttf"),
    "sans-serif",
  );
  GlobalFonts.registerFromPath(
    join(process.cwd(), "src/assets/fonts/Nunito-Bold.ttf"),
    "sans-serif",
  );
} catch {
  // fallback silencioso si ya están registradas
}

export interface RobloxCardData {
  gameName: string;
  details?: string;
  state?: string;
  coverUrl?: string | null;
  elapsedMs: number;
  username: string;
}

// ─── utilidades matemáticas de dibujo ─────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function truncate(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0,
    hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

function formatElapsed(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── renderer principal (bento ui) ────────────────────────────────────────────

export async function renderRobloxCard(data: RobloxCardData): Promise<Buffer> {
  const W = 520;
  const H = 160;
  const PAD = 16;
  const ART_S = 128;
  const ART_X = PAD;
  const ART_Y = PAD;
  const TEXT_X = ART_X + ART_S + 20;
  const TEXT_W = W - TEXT_X - PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // 1. base de la tarjeta (gris oscuro nativo de discord)
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.clip();
  ctx.fillStyle = "#1e1f22";
  ctx.fill();
  ctx.closePath();

  // 2. arte del juego (icono cuadrado sin deformaciones)
  ctx.beginPath();
  roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 12);
  ctx.fillStyle = "#2b2d31";
  ctx.fill();
  ctx.closePath();

  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 12);
      ctx.clip();
      ctx.drawImage(img, ART_X, ART_Y, ART_S, ART_S);
      ctx.restore();
    } catch {
      // fallback silencioso si falla la imagen externa
    }
  }

  // 3. textos de la actividad
  const TITLE_Y = PAD + 24;
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, data.gameName, TEXT_W), TEXT_X, TITLE_Y);

  // subtítulo modular (usa details o state según lo que venga de discord)
  const displayState = data.details || data.state || "jugando a roblox";
  const STATE_Y = TITLE_Y + 20;
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(truncate(ctx, displayState, TEXT_W), TEXT_X, STATE_Y);

  // 4. bento grid (módulos inferiores)
  const BOX_Y = H - PAD - 36;
  const BOX_H = 36;

  // módulo de tiempo transcurrido
  const timeStr = formatElapsed(data.elapsedMs);
  ctx.font = "bold 14px sans-serif";
  const timeW = ctx.measureText(timeStr).width + 36;

  ctx.beginPath();
  roundRect(ctx, TEXT_X, BOX_Y, timeW, BOX_H, 8);
  ctx.fillStyle = "rgba(35, 165, 89, 0.1)";
  ctx.fill();

  // punto verde de sesión activa
  ctx.beginPath();
  ctx.arc(TEXT_X + 14, BOX_Y + BOX_H / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#23a559";
  ctx.fill();

  ctx.fillStyle = "#23a559";
  ctx.textBaseline = "middle";
  ctx.fillText(timeStr, TEXT_X + 24, BOX_Y + BOX_H / 2 + 1);

  // módulo para el logo de roblox (corregido para linux)
  const logoBoxX = TEXT_X + timeW + 10;
  const logoBoxW = 46;

  ctx.beginPath();
  roundRect(ctx, logoBoxX, BOX_Y, logoBoxW, BOX_H, 8);
  ctx.fillStyle = "#2b2d31";
  ctx.fill();

  try {
    const logoPath = join(
      process.cwd(),
      "src/assets/Images/icons/RobloxLogo.png",
    );
    const logoBuffer = await readFile(logoPath);
    const logoImg = await loadImage(logoBuffer);
    ctx.drawImage(
      logoImg,
      logoBoxX + (logoBoxW - 20) / 2,
      BOX_Y + (BOX_H - 20) / 2,
      20,
      20,
    );
  } catch (error) {
    console.error("error al cargar roblox logo en el canvas:", error);
  }

  // 5. tag del usuario (esquina inferior derecha)
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(data.username, W - PAD, H - PAD);

  return canvas.toBuffer("image/png");
}
