import { AttachmentBuilder } from "discord.js";
import {
  C,
  createBaseCanvas,
  drawBar,
  drawPanel,
  fitText,
  font,
  getCanvasLibrary,
  L,
  noShadow,
  shadow,
} from "./canvas";
import type { GlobalRankData } from "./types";

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `${r},${g},${b}`;
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amount);
  const g = Math.min(255, ((n >> 8) & 255) + amount);
  const b = Math.min(255, (n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export async function generateGlobalRankBanner(
  data: GlobalRankData,
): Promise<AttachmentBuilder | null> {
  if (!getCanvasLibrary()) return null;
  try {
    const { canvas, ctx } = await createBaseCanvas(data.avatarBuffer);
    const tierColor = `rgba(${hexToRgb(data.tier.color)},0.22)`;
    drawPanel(
      ctx,
      `#${data.globalRank}`,
      "global",
      `/${data.totalUsers.toLocaleString()}`,
      tierColor,
    );

    const maxW = L.info.maxRight - L.info.x;
    const { font: usernameFont, text: usernameText } = fitText(
      ctx,
      data.username,
      maxW,
      34,
      20,
      "bold",
    );
    shadow(ctx, 12);
    ctx.fillStyle = C.white;
    ctx.font = usernameFont;
    ctx.textAlign = "left";
    ctx.fillText(usernameText, L.info.x, L.usernameY);
    noShadow(ctx);

    ctx.fillStyle = C.lav;
    ctx.font = font(25, "normal");
    ctx.fillText(`Global Level ${data.globalLevel}`, L.info.x, L.levelY);

    ctx.fillStyle = C.muted;
    ctx.font = font(15, "normal");
    ctx.fillText(
      `${data.tier.emoji}  ${data.tier.name}  ·  ${data.tier.nameJp}`,
      L.info.x,
      L.subY,
    );

    const tierHex = `#${data.tier.color.toString(16).padStart(6, "0")}`;
    drawBar(ctx, data.progressPercent, tierHex, lighten(tierHex, 40));

    ctx.fillStyle = C.muted;
    ctx.font = font(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} Global XP  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    const hours = Math.floor(data.totalVoiceMinutes / 60);
    ctx.fillStyle = C.muted;
    ctx.font = font(14, "normal");
    ctx.fillText(
      `Messages: ${data.totalMessages.toLocaleString()}  ·  Voice: ${hours}h total`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "global-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateGlobalRankBanner:", err);
    return null;
  }
}
