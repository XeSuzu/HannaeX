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
} catch (e) {
  console.log("error cargando fuentes:", e);
}

export interface SpotifyCardData {
  track: string;
  artist: string;
  album?: string;
  coverUrl?: string | null;
  progressMs: number;
  durationMs: number;
  username: string;
  avatarUrl?: string | null;
}

// ─── utilidades ───────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}

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

function formatMs(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

const WAVE_HEIGHTS = [4, 6, 5, 8, 6, 9, 7, 5, 4, 7, 5, 8, 6, 9, 5];

function drawWaveform(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  maxH: number,
  accent: string,
  accentLight: string,
  progress: number,
) {
  const barW = 2;
  const gap = 1.5;
  const totalBars = WAVE_HEIGHTS.length;
  const activeBars = Math.floor(progress * totalBars);

  WAVE_HEIGHTS.forEach((h, i) => {
    const scaledH = Math.round((h / 20) * maxH);
    const bx = x + i * (barW + gap);
    const by = y + maxH - scaledH;

    ctx.beginPath();
    ctx.roundRect(bx, by, barW, scaledH, 1);
    ctx.fillStyle = i < activeBars ? accentLight : accent;
    ctx.globalAlpha = i < activeBars ? 1.0 : 0.3;
    ctx.fill();
    ctx.closePath();
  });
  ctx.globalAlpha = 1;
}

// ─── renderer principal ───────────────────────────────────────────────────────

export async function renderSpotifyCard(
  data: SpotifyCardData,
): Promise<Buffer> {
  const W = 520;
  const H = 160;
  const PAD = 16;
  const ART_S = 128;
  const ART_X = PAD;
  const ART_Y = PAD;
  const TEXT_X = ART_X + ART_S + 14;
  const TEXT_W = W - TEXT_X - PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const rawProgress =
    data.durationMs > 0 ? data.progressMs / data.durationMs : 0;
  const progress = isNaN(rawProgress)
    ? 0
    : Math.min(1, Math.max(0, rawProgress));

  // 1. base y recorte de la tarjeta
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.clip();
  ctx.closePath();

  // 2. fondo adaptativo desenfocado (blurred cover art)
  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);
      ctx.filter = "blur(18px)";
      ctx.drawImage(img, -20, -20, W + 40, H + 40);
      ctx.filter = "none";
    } catch {
      ctx.fillStyle = "#121214";
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#121214";
    ctx.fill();
  }

  // 3. overlay para garantizar contraste
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fill();
  ctx.closePath();
  ctx.restore();

  // 4. arte del álbum en miniatura
  ctx.beginPath();
  roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.closePath();

  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 10);
      ctx.clip();
      ctx.drawImage(img, ART_X, ART_Y, ART_S, ART_S);
      ctx.closePath();
      ctx.restore();
    } catch {
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♪", ART_X + ART_S / 2, ART_Y + ART_S / 2);
    }
  }

  // 5. cargar el logo png nativo de spotify
  const logoSize = 26;
  const logoX = W - PAD - logoSize;
  const logoY = PAD;

  try {
    // apunta desde la raíz de tu proyecto hacia src
    const logoPath = join(
      process.cwd(),
      "src/assets/Images/Icons/SpotifyLogo.png",
    );
    // leemos el archivo como buffer primero para que canvas no intente parsearlo como url
    const logoBuffer = await readFile(logoPath);
    const logoImg = await loadImage(logoBuffer);

    ctx.save();
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } catch (error) {
    console.error("error al cargar spotify logo:", error);
  }

  // 6. textos
  const TRACK_Y = PAD + 24;
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, data.track, TEXT_W - 35), TEXT_X, TRACK_Y);

  const ARTIST_Y = TRACK_Y + 18;
  const artistStr = data.album ? `${data.artist} · ${data.album}` : data.artist;
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(truncate(ctx, artistStr, TEXT_W), TEXT_X, ARTIST_Y);

  // 7. waveform con color unificado
  const WAVE_H = 12;
  const WAVE_Y = ARTIST_Y + 8;
  const waveColorActive = "#ffffff";
  const waveColorInactive = "rgba(255, 255, 255, 0.22)";

  drawWaveform(
    ctx,
    TEXT_X,
    WAVE_Y,
    WAVE_H,
    waveColorInactive,
    waveColorActive,
    progress,
  );

  // 8. barra de progreso
  const BAR_Y = WAVE_Y + WAVE_H + 12;
  const BAR_H = 3;
  const BAR_W = TEXT_W;

  ctx.beginPath();
  roundRect(ctx, TEXT_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fill();
  ctx.closePath();

  const fillW = Math.min(BAR_W, Math.max(BAR_H * 2, BAR_W * progress));
  if (fillW > 0) {
    ctx.beginPath();
    roundRect(ctx, TEXT_X, BAR_Y, fillW, BAR_H, BAR_H / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();
  }

  // 9. metadatos de tiempo
  const TIME_Y = BAR_Y + BAR_H + 6;
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textBaseline = "top";

  ctx.textAlign = "left";
  ctx.fillText(formatMs(data.progressMs), TEXT_X, TIME_Y);

  ctx.textAlign = "right";
  ctx.fillText(formatMs(data.durationMs), TEXT_X + BAR_W, TIME_Y);

  const USER_Y = H - PAD / 2;
  ctx.font = "9px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(data.username, W - PAD, USER_Y);

  return canvas.toBuffer("image/png");
}
