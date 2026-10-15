import { ShipTier } from "./config";
import { hexToRgba, roundRect, lightenColor } from "./utils";

export function drawGlassCard(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, x, y, w, h, 30);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = hexToRgba(color, 0.3);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export function drawEnhancedAvatar(
  ctx: any,
  img: any,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
) {
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r + 20, y - r + 20);
  ctx.lineTo(x - r - 10, y - r - 30);
  ctx.lineTo(x - r + 50, y - r + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r - 20, y - r + 20);
  ctx.lineTo(x + r + 10, y - r - 30);
  ctx.lineTo(x + r - 50, y - r + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPercentage(
  ctx: any,
  x: number,
  y: number,
  percentage: number,
  tier: ShipTier,
) {
  ctx.save();
  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.lineWidth = 8;
  ctx.strokeText(`${percentage}%`, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 20;
  ctx.fillText(`${percentage}%`, x, y);
  ctx.restore();
}

export function drawProgressBar(
  ctx: any,
  x: number,
  y: number,
  width: number,
  height: number,
  percentage: number,
  tier: ShipTier,
) {
  ctx.save();
  const barX = x - width / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  roundRect(ctx, barX, y, width, height, height / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (percentage > 0) {
    const fillWidth = (width * percentage) / 100;
    const grad = ctx.createLinearGradient(barX, y, barX + fillWidth, y);
    grad.addColorStop(0, tier.color);
    grad.addColorStop(1, lightenColor(tier.color, 30));
    ctx.fillStyle = grad;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 15;
    roundRect(ctx, barX, y, fillWidth, height, height / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    roundRect(ctx, barX, y, fillWidth, height / 2, height / 2);
    ctx.fill();
  }
  ctx.restore();
}
