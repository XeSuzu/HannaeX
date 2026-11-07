import { loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { ShipTier, BANNERS_DIR } from "./config";
import { hexToRgba } from "./utils";

export async function drawBackground(
  ctx: any,
  width: number,
  height: number,
  tier: ShipTier,
) {
  let bgDrawn = false;
  if (fs.existsSync(BANNERS_DIR)) {
    const files = fs
      .readdirSync(BANNERS_DIR)
      .filter((f) => f.match(/\.(png|jpg|jpeg|webp)$/i));
    if (files.length > 0) {
      try {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const img = await loadImage(path.join(BANNERS_DIR, randomFile));
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        bgDrawn = true;
      } catch (e) {
        console.error("Error cargando banner:", e);
      }
    }
  }

  if (!bgDrawn) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, tier.gradient[0]);
    grad.addColorStop(1, tier.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const overlay = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width,
  );
  overlay.addColorStop(0, hexToRgba(tier.color, 0.2));
  overlay.addColorStop(1, "rgba(0, 0, 0, 0.7)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);
}

export function drawEnhancedParticles(
  ctx: any,
  width: number,
  height: number,
  tier: ShipTier,
) {
  ctx.save();
  for (let i = 0; i < tier.particles; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 4 + 1;
    const opacity = Math.random() * 0.6 + 0.2;
    ctx.fillStyle = hexToRgba(tier.color, opacity);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (Math.random() > 0.7) {
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

export function drawRedThread(
  ctx: any,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tier: ShipTier,
) {
  if (tier.threadStyle === "none") return;
  ctx.save();
  const midX = (x1 + x2) / 2;
  const curve = tier.threadStyle === "destiny" ? 80 : 60;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(midX, y1 - curve, x2, y2);

  if (tier.threadStyle === "weak") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
  } else if (tier.threadStyle === "normal") {
    ctx.strokeStyle = hexToRgba(tier.color, 0.6);
    ctx.lineWidth = 4;
  } else if (tier.threadStyle === "strong") {
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 15;
  } else if (tier.threadStyle === "destiny") {
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 6;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 25;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
  }
  ctx.stroke();
  ctx.restore();
}

export function drawCentralHeart(
  ctx: any,
  x: number,
  y: number,
  tier: ShipTier,
) {
  ctx.save();
  ctx.fillStyle = hexToRgba(tier.color, 0.2);
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = tier.glow;
  ctx.beginPath();
  ctx.arc(x, y, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fonts = [
    '85px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
    '85px NotoEmoji, "Apple Color Emoji", "Segoe UI Emoji", Arial',
    '85px "Segoe UI Emoji", "Apple Color Emoji", Arial',
  ];

  let rendered = false;
  for (const font of fonts) {
    ctx.font = font;
    if (tier.glow > 0) {
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = tier.glow * 1.5;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tier.heart, x, y);
    rendered = true;
    break;
  }

  if (!rendered) {
    ctx.shadowBlur = 0;
    drawHeartShape(ctx, x, y, 40, tier.color);
  }

  if (tier.range[0] >= 86) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexToRgba(tier.color, 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeartShape(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(
    x - size / 2,
    y + (size + topCurveHeight) / 2,
    x,
    y + (size + topCurveHeight) / 2,
    x,
    y + size,
  );
  ctx.bezierCurveTo(
    x,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + topCurveHeight,
  );
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.fill();
  ctx.restore();
}
