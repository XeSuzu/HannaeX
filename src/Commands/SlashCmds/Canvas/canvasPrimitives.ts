export function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}


export async function drawVerifiedBadge(
  ctx: any,
  x: number,
  y: number,
  scale: number = 1,
  color: string = "#3897f0",
) {
  ctx.save();
  const size = 24 * scale;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y);
  ctx.lineTo(x + size * 0.47, y + size * 0.22);
  ctx.lineTo(x + size * 0.72, y - size * 0.22);
  ctx.stroke();
  ctx.restore();
}
