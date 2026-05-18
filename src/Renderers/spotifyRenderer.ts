import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * amount)),
    Math.min(255, Math.round(g + (255 - g) * amount)),
    Math.min(255, Math.round(b + (255 - b) * amount)),
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount)),
  );
}

/**
 * Extrae el color dominante de una imagen ya cargada.
 * Samplea una grilla de píxeles, descarta los muy oscuros/claros/grises
 * y devuelve el hex más frecuente agrupado en celdas de 24.
 */
async function getDominantColor(imageUrl: string): Promise<string> {
  try {
    const img = await loadImage(imageUrl);
    const size = 80;
    const tmp = createCanvas(size, size);
    const ctx = tmp.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const freq: Record<string, number> = {};
    const step = 4 * 4; // cada 4 píxeles

    for (let i = 0; i < data.length; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // descartá muy oscuros, muy claros o muy grises
      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness < 30 || brightness > 220 || saturation < 30) continue;

      // agrupá en celdas de 24 para reducir ruido
      const key = rgbToHex(
        Math.round(r / 24) * 24,
        Math.round(g / 24) * 24,
        Math.round(b / 24) * 24,
      );
      freq[key] = (freq[key] ?? 0) + 1;
    }

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "#7c3aed";
  } catch {
    return "#7c3aed";
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
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

// Alturas fijas para las barras — dan sensación orgánica sin ser random en cada render
const WAVE_HEIGHTS = [6, 14, 10, 20, 16, 22, 18, 12, 8, 16, 10, 18, 14, 20, 8];

function drawWaveform(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  accent: string,
  progress: number, // 0–1
) {
  const barW = 3;
  const gap = 2;
  const maxH = 22;
  const totalBars = WAVE_HEIGHTS.length;
  const activeBars = Math.round(progress * totalBars);

  WAVE_HEIGHTS.forEach((h, i) => {
    const bx = x + i * (barW + gap);
    const by = y + maxH - h;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, h, 2);
    if (i < activeBars) {
      ctx.fillStyle = lighten(accent, 0.3);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.35;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ─── Renderer principal ───────────────────────────────────────────────────────

export async function renderSpotifyCard(
  data: SpotifyCardData,
): Promise<Buffer> {
  const W = 520;
  const H = 150;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Color dominante
  const accent = data.coverUrl
    ? await getDominantColor(data.coverUrl)
    : "#7c3aed";

  const accentLight = lighten(accent, 0.35);
  const accentDark = darken(accent, 0.55);
  const bgDark = darken(accent, 0.82);
  const bgDeep = darken(accent, 0.9);

  // ── Fondo ──────────────────────────────────────────────────────────────────
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = bgDeep;
  ctx.fill();

  // Glow sutil en la base
  const glow = ctx.createRadialGradient(W / 2, H + 20, 0, W / 2, H + 20, 180);
  glow.addColorStop(0, accent + "40");
  glow.addColorStop(1, "transparent");
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = glow;
  ctx.fill();

  // ── Portada ────────────────────────────────────────────────────────────────
  const artX = 18;
  const artY = 18;
  const artS = 70;

  roundRect(ctx, artX, artY, artS, artS, 10);
  ctx.fillStyle = accentDark;
  ctx.fill();

  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl);
      ctx.save();
      roundRect(ctx, artX, artY, artS, artS, 10);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artS, artS);
      ctx.restore();
    } catch {
      // fallback: queda el rect de color
    }
  } else {
    // ícono de nota musical como fallback
    ctx.save();
    ctx.fillStyle = accent + "50";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", artX + artS / 2, artY + artS / 2);
    ctx.restore();
  }

  // ── Badge "spotify" ────────────────────────────────────────────────────────
  const badgeX = 106;
  const badgeY = 16;
  const badgeH = 18;
  const badgeW = 74;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 99);
  ctx.fillStyle = accent + "28";
  ctx.fill();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 99);
  ctx.strokeStyle = accent + "55";
  ctx.lineWidth = 1;
  ctx.stroke();

  // dot
  ctx.beginPath();
  ctx.arc(badgeX + 10, badgeY + 9, 3, 0, Math.PI * 2);
  ctx.fillStyle = accentLight;
  ctx.fill();

  ctx.font = "500 9px 'sans-serif'";
  ctx.fillStyle = accentLight;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("SPOTIFY", badgeX + 17, badgeY + 9);

  // ── Track & artista ────────────────────────────────────────────────────────
  ctx.textBaseline = "alphabetic";

  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  const trackText = truncate(ctx, data.track, W - 106 - 20);
  ctx.fillText(trackText, 106, 52);

  ctx.font = "400 11px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  const artistText = data.album
    ? truncate(ctx, `${data.artist} · ${data.album}`, W - 106 - 20)
    : truncate(ctx, data.artist, W - 106 - 20);
  ctx.fillText(artistText, 106, 70);

  // ── Waveform ───────────────────────────────────────────────────────────────
  const waveX = 106;
  const waveY = 82;
  const progress = data.durationMs > 0 ? data.progressMs / data.durationMs : 0;
  drawWaveform(ctx, waveX, waveY, accent, progress);

  // ── Barra de progreso ──────────────────────────────────────────────────────
  const barX = 106;
  const barY = 116;
  const barW2 = W - barX - 20;
  const barH = 2;

  // track
  roundRect(ctx, barX, barY, barW2, barH, 99);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();

  // fill
  const fillW = Math.max(6, barW2 * progress);
  roundRect(ctx, barX, barY, fillW, barH, 99);
  ctx.fillStyle = accentLight;
  ctx.fill();

  // ── Timestamps ─────────────────────────────────────────────────────────────
  ctx.font = "400 9px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(formatMs(data.progressMs), barX, barY + 6);
  ctx.textAlign = "right";
  ctx.fillText(formatMs(data.durationMs), barX + barW2, barY + 6);

  // ── Username ───────────────────────────────────────────────────────────────
  if (data.avatarUrl) {
    try {
      const av = await loadImage(data.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W - 14 - 10, H - 14, 8, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(av, W - 14 - 18, H - 22, 16, 16);
      ctx.restore();
    } catch {}
  }

  ctx.font = "400 9px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(data.username, W - 14, H - 8);

  return canvas.toBuffer("image/png");
}
