import {
  createCanvas,
  loadImage,
  GlobalFonts,
  Image,
  CanvasRenderingContext2D,
} from "@napi-rs/canvas";
import { StreakGroup } from "../Models/StreakGroup";
import { HoshikoClient } from "..";
import { User } from "discord.js";

try {
  GlobalFonts.registerFromPath("./assets/fonts/Nunito-Bold.ttf", "Nunito Bold");
  GlobalFonts.registerFromPath("./assets/fonts/Nunito-Regular.ttf", "Nunito Regular");
} catch (error) {
  console.error("⚠️ No se pudieron cargar las fuentes.", error);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCircularImage(
  ctx: any,
  image: Image,
  x: number,
  y: number,
  radius: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, radius * 2, radius * 2);
  ctx.restore();
}

const tierColors: Record<string, { start: string; end: string }> = {
  Mayoi: { start: "#434343", end: "#000000" },
  Ketsui: { start: "#f12711", end: "#f5af19" },
  Aruki: { start: "#8E2DE2", end: "#4A00E0" },
  Negai: { start: "#1D2B64", end: "#F8CDDA" },
  Arashi: { start: "#00c6ff", end: "#0072ff" },
  Kiseki: { start: "#F7971E", end: "#FFD200" },
  default: { start: "#2c2f33", end: "#23272a" },
};

export async function generateStreakCard(
  groupId: string,
  client: HoshikoClient
): Promise<Buffer> {
  const streak = await StreakGroup.findById(groupId);
  if (!streak) throw new Error("No se encontró la racha.");

  const canvas = createCanvas(900, 450);
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No se pudo obtener el contexto.");

  // Fondo gradiente
  const colors = tierColors[streak.tier] || tierColors.default;
  const gradient = ctx.createLinearGradient(0, 0, 900, 450);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 450);

  // Tarjeta interna glass
  ctx.save();
  drawRoundedRect(ctx, 40, 40, 820, 370, 25);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  // Borde sutil para el efecto de cristal
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Sombra suave
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 20;

  // Nombre
  ctx.font = '40px "Nunito Bold"';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(streak.name, 450, 110);

  // Número grande
  ctx.font = '100px "Nunito Bold"';
  ctx.fillText(`${streak.currentStreak}`, 450, 220);

  ctx.shadowBlur = 0;

  ctx.font = '28px "Nunito Regular"';
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("días de racha", 450, 260);

  // Tier actual
  ctx.font = '24px "Nunito Bold"';
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(`Tier: ${streak.tier}`, 450, 295);

  // Avatares
  const members: (User | null)[] = await Promise.all(
    streak.memberIds.map(id =>
      client.users.fetch(id).catch(() => null)
    )
  );

  const validMembers = members.filter((m): m is User => m !== null);

  const avatarRadius = 50;
  const spacing = 25;
  const totalWidth =
    validMembers.length * (avatarRadius * 2) +
    (validMembers.length - 1) * spacing;

  let startX = (900 - totalWidth) / 2;

  for (const member of validMembers) {
    try {
      const avatar = await loadImage(
        member.displayAvatarURL({ extension: "png", size: 256 })
      );

      // borde glow
      ctx.beginPath();
      ctx.arc(startX + avatarRadius, 300 + avatarRadius, avatarRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();

      drawCircularImage(ctx, avatar, startX, 300, avatarRadius);
      startX += avatarRadius * 2 + spacing;
    } catch {
      ctx.beginPath();
      ctx.arc(startX + avatarRadius, 300 + avatarRadius, avatarRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#1e1e1e";
      ctx.fill();
      startX += avatarRadius * 2 + spacing;
    }
  }

  // Mejor racha
  ctx.font = '20px "Nunito Regular"';
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "right";
  ctx.fillText(
    `Mejor racha: ${streak.bestStreak} días`,
    860,
    420
  );

  return canvas.toBuffer("image/png");
}