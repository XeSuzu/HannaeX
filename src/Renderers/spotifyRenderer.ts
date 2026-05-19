import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

// ─── Utilidades de color ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")
  );
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

async function getDominantColor(imageUrl: string): Promise<string> {
  try {
    const img = await loadImage(imageUrl);
    const size = 90;
    const tmp = createCanvas(size, size);
    const ctx = tmp.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const freq: Record<string, number> = {};
    const step = 4 * 4;

    for (let i = 0; i < data.length; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      const isGray = saturation < 18;
      const isTooDark = brightness < 22;
      const isTooPale = brightness > 245 && saturation < 70;
      const isHyperSaturated = saturation > 230 && brightness > 200;
      if (isTooDark || isTooPale || isGray || isHyperSaturated) continue;

      const key = rgbToHex(
        Math.min(255, Math.round(r / 20) * 20),
        Math.min(255, Math.round(g / 20) * 20),
        Math.min(255, Math.round(b / 20) * 20),
      );
      freq[key] = (freq[key] ?? 0) + 1;
    }

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "#1db954";
  } catch {
    return "#1db954";
  }
}

// ─── Helpers de canvas ────────────────────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
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

function truncate(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

function formatMs(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

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
    roundRect(ctx, bx, by, barW, scaledH, 1);
    ctx.fillStyle = i < activeBars ? accentLight : accent;
    ctx.globalAlpha = i < activeBars ? 1.0 : 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ─── Renderer principal ───────────────────────────────────────────────────────

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

  // Obtener colores base
  let accent = data.coverUrl
    ? await getDominantColor(data.coverUrl)
    : "#1db954";

  // Forzar un color estético si el algoritmo devuelve tonos excesivamente oscuros o grises
  const [r, g, b] = hexToRgb(accent);
  const brightness = (r + g + b) / 3;
  if (brightness < 45) {
    accent = "#1db954"; // Fallback a verde Spotify para mantener la identidad visual vibrante
  }

  const accentLight = lighten(accent, 0.48);
  const accentDark = darken(accent, 0.6);
  const bgDeep = darken(accent, 0.88);

  // Normalizar el progreso correctamente clampiado
  const rawProgress =
    data.durationMs > 0 ? data.progressMs / data.durationMs : 0;
  const progress = isNaN(rawProgress)
    ? 0
    : Math.min(1, Math.max(0, rawProgress));

  // Fondo principal de la tarjeta
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = bgDeep;
  ctx.fill();

  // Fondo del Arte si falla la carga
  roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 10);
  ctx.fillStyle = accentDark;
  ctx.fill();

  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);
      ctx.save();
      roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 10);
      ctx.clip();
      ctx.drawImage(img, ART_X, ART_Y, ART_S, ART_S);
      ctx.restore();
    } catch {
      ctx.font = "32px sans-serif";
      ctx.fillStyle = accent + "60";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♪", ART_X + ART_S / 2, ART_Y + ART_S / 2);
    }
  }

  // ─── Badge de Spotify ───────────────────────────────────────────────────────
  const BADGE_H = 18;
  const BADGE_W = 74;
  const BADGE_X = TEXT_X;
  const BADGE_Y = PAD;

  // Renderizado del contenedor del badge
  roundRect(ctx, BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 99);
  ctx.fillStyle = accent + "25";
  ctx.fill();

  roundRect(ctx, BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 99);
  ctx.strokeStyle = accentLight + "40";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Punto indicador dinámico
  const [alR, alG, alB] = hexToRgb(accentLight);
  const alBrightness = (alR + alG + alB) / 3;
  const badgeColor = alBrightness < 140 ? "#1db954" : accentLight;

  ctx.beginPath();
  ctx.arc(BADGE_X + 11, BADGE_Y + BADGE_H / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = badgeColor;
  ctx.fill();

  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = badgeColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("SPOTIFY", BADGE_X + 20, BADGE_Y + BADGE_H / 2);

  // ─── Información de Pista y Artista ─────────────────────────────────────────
  const TRACK_Y = BADGE_Y + BADGE_H + 16;
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, data.track, TEXT_W), TEXT_X, TRACK_Y);

  const ARTIST_Y = TRACK_Y + 16;
  const artistStr = data.album ? `${data.artist} · ${data.album}` : data.artist;
  ctx.font = "500 11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillText(truncate(ctx, artistStr, TEXT_W), TEXT_X, ARTIST_Y);

  // ─── Renderizado del Waveform ───────────────────────────────────────────────
  const WAVE_H = 12;
  const WAVE_Y = ARTIST_Y + 8;

  // Umbral estricto para mantener la legibilidad de las barras del ecualizador
  const waveColorActive = alBrightness < 140 ? "#ffffff" : accentLight;
  const waveColorInactive =
    alBrightness < 140 ? "rgba(255, 255, 255, 0.2)" : accent;

  drawWaveform(
    ctx,
    TEXT_X,
    WAVE_Y,
    WAVE_H,
    waveColorInactive,
    waveColorActive,
    progress,
  );

  // ─── Barra de progreso lineal ──────────────────────────────────────────────
  const BAR_Y = WAVE_Y + WAVE_H + 12;
  const BAR_H = 3;
  const BAR_W = TEXT_W;

  roundRect(ctx, TEXT_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fill();

  const fillW = Math.min(BAR_W, Math.max(BAR_H * 2, BAR_W * progress));
  if (fillW > 0) {
    roundRect(ctx, TEXT_X, BAR_Y, fillW, BAR_H, BAR_H / 2);
    ctx.fillStyle = waveColorActive;
    ctx.fill();
  }

  // ─── Tiempos e Indicadores métricos ─────────────────────────────────────────
  const TIME_Y = BAR_Y + BAR_H + 6;
  ctx.font = "500 10px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.textBaseline = "top";

  ctx.textAlign = "left";
  ctx.fillText(formatMs(data.progressMs), TEXT_X, TIME_Y);

  ctx.textAlign = "right";
  ctx.fillText(formatMs(data.durationMs), TEXT_X + BAR_W, TIME_Y);

  // Nombre de usuario en la esquina inferior derecha
  const USER_Y = H - PAD / 2;
  ctx.font = "500 9px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(data.username, W - PAD, USER_Y);

  return canvas.toBuffer("image/png");
}
