import {
  createCanvas,
  GlobalFonts,
  loadImage,
  SKRSContext2D,
} from "@napi-rs/canvas";
import { join } from "path";

// ─── registro de fuentes (nunito) ─────────────────────────────────────────────
try {
  GlobalFonts.registerFromPath(
    join(__dirname, "./fonts/Nunito-Regular.ttf"),
    "sans-serif",
  );
  GlobalFonts.registerFromPath(
    join(__dirname, "./fonts/Nunito-Bold.ttf"),
    "sans-serif",
  );
} catch {
  // evita colisiones si se recarga el módulo en caliente
}

// ─── interfaces ───────────────────────────────────────────────────────────────

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

// ─── utilidades de color y formato ────────────────────────────────────────────

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
      if (saturation < 18 || brightness < 22 || brightness > 245) continue;

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

// ─── elementos gráficos vectoriales ──────────────────────────────────────────

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

function drawSpotifyLogo(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  bgDeep: string,
) {
  // 1. Círculo base verde oficial de Spotify
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#1db954";
  ctx.fill();
  ctx.closePath();

  // 2. Aislar y rotar el contexto para que las ondas se dibujen perfectas en Linux
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.42); // Rotación exacta para la inclinación característica de Spotify

  ctx.strokeStyle = bgDeep;
  ctx.lineCap = "round";

  const drawWave = (
    radius: number,
    width: number,
    startAngle: number,
    endAngle: number,
  ) => {
    ctx.beginPath();
    ctx.lineWidth = width;
    // Dibujamos las ondas centradas de forma nativa
    ctx.arc(0, r * 0.18, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.closePath();
  };

  // Ángulos optimizados para arcos superiores limpios y simétricos
  // Onda superior (más larga y gruesa)
  drawWave(r * 0.62, 2.2, Math.PI * 1.22, Math.PI * 1.78);
  // Onda media
  drawWave(r * 0.44, 1.9, Math.PI * 1.24, Math.PI * 1.76);
  // Onda inferior (más corta y delgada)
  drawWave(r * 0.26, 1.5, Math.PI * 1.26, Math.PI * 1.74);

  ctx.restore(); // Restauramos el lienzo a su posición original
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

  // color fallback por si no hay portada
  const defaultAccent = "#1db954";
  const accentLight = lighten(defaultAccent, 0.48);

  const rawProgress =
    data.durationMs > 0 ? data.progressMs / data.durationMs : 0;
  const progress = isNaN(rawProgress)
    ? 0
    : Math.min(1, Math.max(0, rawProgress));

  // 1. dibujar la base redondeada de la tarjeta
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.clip();
  ctx.closePath();

  // 2. renderizar el fondo adaptativo (blurred background)
  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);

      // aplicamos el filtro de desenfoque nativo
      ctx.filter = "blur(18px)";

      // dibujamos la carátula estirada para cubrir todo el fondo
      // la desplazamos un poco hacia arriba/centro para capturar mejores tonos
      ctx.drawImage(img, -20, -20, W + 40, H + 40);

      // quitamos el filtro para los siguientes elementos
      ctx.filter = "none";
    } catch {
      // fallback si falla la carga de la imagen de fondo
      ctx.fillStyle = "#121214";
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#121214";
    ctx.fill();
  }

  // 3. capa de superposición oscura (overlay) para garantizar el contraste del texto blanco
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)"; // oscurece el fondo desenfocado un 62%
  ctx.fill();
  ctx.closePath();
  ctx.restore(); // sale del clip de las esquinas redondeadas de la tarjeta

  // 4. placeholder/fondo del arte del álbum pequeño
  ctx.beginPath();
  roundRect(ctx, ART_X, ART_Y, ART_S, ART_S, 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.closePath();

  // 5. dibujar el arte del álbum miniatura
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

  // 6. logo de spotify nativo (esquina superior derecha) con fondo oscuro fijo para contraste
  drawSpotifyLogo(ctx, W - PAD - 12, PAD + 12, 12, "#09090b");

  // 7. textos principales de la canción
  const TRACK_Y = PAD + 24;
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, data.track, TEXT_W - 30), TEXT_X, TRACK_Y);

  const ARTIST_Y = TRACK_Y + 18;
  const artistStr = data.album ? `${data.artist} · ${data.album}` : data.artist;
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; // texto secundario más nítido sobre el overlay
  ctx.fillText(truncate(ctx, artistStr, TEXT_W), TEXT_X, ARTIST_Y);

  // 8. waveform adaptativo en color blanco/translúcido fijo (estilo premium)
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

  // 9. barra de progreso lineal
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

  // 10. marcas de tiempo y usuario
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
