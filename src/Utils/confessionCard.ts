import { AttachmentBuilder } from "discord.js";
import {
  C,
  fitText,
  font,
  getCanvasLibrary,
  noShadow,
  registerFonts,
  resolveCardBackgroundTheme,
  rrPath,
  shadow,
} from "./levelBanners/canvas";

export interface ConfessionCardData {
  title: string;
  confessionId: number;
  content: string;
  isAnonymous: boolean;
  authorName?: string;
  authorAvatarBuffer?: Buffer | null;
  serverName: string;
  backgroundTheme?: string;
}

const CW = 850;
const CH = 340;

export async function generateConfessionCard(
  data: ConfessionCardData,
): Promise<AttachmentBuilder | null> {
  const canvasLib = getCanvasLibrary();
  if (!canvasLib) return null;

  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;
    registerFonts(GlobalFonts);

    const canvas = createCanvas(CW, CH);
    const ctx = canvas.getContext("2d");

    const preset = resolveCardBackgroundTheme(data.backgroundTheme || "sakura");

    // Fondo degradado o color base
    if (preset.type === "gradient" && preset.colors) {
      const grad = ctx.createLinearGradient(0, 0, CW, CH);
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(0.55, preset.colors[1]);
      grad.addColorStop(1, preset.colors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      if (preset.accentGlow) {
        const glow = ctx.createRadialGradient(
          CW * 0.85,
          CH * 0.2,
          10,
          CW * 0.85,
          CH * 0.2,
          260,
        );
        glow.addColorStop(0, preset.accentGlow);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, CW, CH);
      }
    } else {
      ctx.fillStyle = "#1e1026";
      ctx.fillRect(0, 0, CW, CH);
    }

    // Capa de tarjeta estilo pergamino / cristal
    const px = 28;
    const py = 24;
    const pw = CW - px * 2;
    const ph = CH - py * 2;

    ctx.save();
    rrPath(ctx, px, py, pw, ph, 22);
    ctx.fillStyle = "rgba(10, 6, 20, 0.45)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.stroke();
    ctx.restore();

    // Encabezado superior
    const headerY = py + 38;
    ctx.fillStyle = C.lav;
    ctx.font = font(20, "bold");
    ctx.textAlign = "left";
    const titleText = data.title.toUpperCase();
    ctx.fillText(titleText, px + 28, headerY);

    // Número badge #ID
    ctx.fillStyle = C.gold;
    ctx.font = font(22, "bold");
    ctx.textAlign = "right";
    ctx.fillText(`#${data.confessionId}`, px + pw - 28, headerY);

    // Línea divisoria suave
    ctx.beginPath();
    ctx.moveTo(px + 28, headerY + 14);
    ctx.lineTo(px + pw - 28, headerY + 14);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Texto de la confesión (con wrap automático y comillas aesthetic)
    const textX = px + 36;
    const textY = headerY + 48;
    const maxTextWidth = pw - 72;
    const maxLines = 4;
    const lineHeight = 28;

    ctx.font = font(18, "normal");
    ctx.fillStyle = C.white;
    ctx.textAlign = "left";

    const words = data.content.replace(/\s+/g, " ").trim().split(" ");
    let currentLine = "“ ";
    const lines: string[] = [];

    for (const w of words) {
      const testLine = currentLine + w + " ";
      if (ctx.measureText(testLine).width > maxTextWidth) {
        lines.push(currentLine.trim());
        currentLine = w + " ";
        if (lines.length >= maxLines - 1) break;
      } else {
        currentLine = testLine;
      }
    }
    if (lines.length < maxLines && currentLine.trim().length > 0) {
      lines.push(currentLine.trim() + " ”");
    } else if (lines.length > 0) {
      lines[lines.length - 1] += "... ”";
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, textX, textY + index * lineHeight);
    });

    // Pie de la tarjeta (Autor o Anónimo + Hoshiko)
    const footerY = py + ph - 22;

    if (!data.isAnonymous && data.authorAvatarBuffer) {
      try {
        const avImg = await loadImage(data.authorAvatarBuffer);
        const avX = px + 42;
        const avY = footerY - 10;
        const avR = 14;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avImg, avX - avR, avY - avR, avR * 2, avR * 2);
        ctx.restore();

        ctx.fillStyle = C.lavFaded;
        ctx.font = font(14, "normal");
        ctx.textAlign = "left";
        ctx.fillText(data.authorName || "Público", avX + avR + 10, footerY - 5);
      } catch {
        ctx.fillStyle = C.lavFaded;
        ctx.font = font(14, "normal");
        ctx.textAlign = "left";
        ctx.fillText(data.authorName || "Público", px + 28, footerY - 5);
      }
    } else {
      ctx.fillStyle = C.lavFaded;
      ctx.font = font(14, "normal");
      ctx.textAlign = "left";
      ctx.fillText("🔒 Anónimo", px + 28, footerY - 5);
    }

    ctx.fillStyle = C.muted;
    ctx.font = font(13, "normal");
    ctx.textAlign = "right";
    ctx.fillText(`Hoshiko 🐾 • ${data.serverName}`, px + pw - 28, footerY - 5);

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: `confession-${data.confessionId}.png`,
    });
  } catch (err) {
    console.error("[ConfessionCard] Error renderizando tarjeta canvas:", err);
    return null;
  }
}
