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
import type { ServerRankData } from "./types";

export async function generateServerRankBanner(
  data: ServerRankData,
): Promise<AttachmentBuilder | null> {
  if (!getCanvasLibrary()) return null;
  try {
    const ringColor =
      data.rank === 1
        ? C.gold
        : data.rank === 2
          ? "#E5E7EB"
          : data.rank === 3
            ? "#F59E0B"
            : data.rank <= 10
              ? "#E879F9"
              : "rgba(232,213,255,0.92)";

    const { canvas, ctx } = await createBaseCanvas(
      data.avatarBuffer,
      data.backgroundTheme,
      ringColor,
      data.customBackgroundBuffer,
    );
    const panelTop = data.panelTopText || "TOP";
    const panelBottom = data.panelBottomText || "SERVIDOR";
    drawPanel(ctx, `#${data.rank}`, panelTop, panelBottom, C.goldGlow);

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

    const levelPrefix = data.levelPrefix || "Nivel";
    ctx.fillStyle = C.lav;
    ctx.font = font(25, "bold");
    ctx.fillText(`${levelPrefix} ${data.level}`, L.info.x, L.levelY);

    if (data.voiceLevel !== undefined && data.voiceLevel > 0) {
      const lvlMetrics = ctx.measureText(`${levelPrefix} ${data.level}`);
      const badgeX = L.info.x + lvlMetrics.width + 16;
      ctx.fillStyle = C.cyan;
      ctx.font = font(16, "bold");
      ctx.fillText(`🎙️ VC Lv. ${data.voiceLevel}`, badgeX, L.levelY);
    }

    if (data.badgeSubtitle) {
      ctx.fillStyle = C.muted;
      ctx.font = font(15, "normal");
      ctx.fillText(data.badgeSubtitle, L.info.x, L.subY);
    } else if (data.globalLevel !== undefined) {
      ctx.fillStyle = C.muted;
      ctx.font = font(15, "normal");
      const globalText = data.globalRank
        ? `Global Lv.${data.globalLevel}  ·  #${data.globalRank} global`
        : `Global Lv.${data.globalLevel}`;
      ctx.fillText(globalText, L.info.x, L.subY);
    }

    drawBar(ctx, data.progressPercent, "#A855F7", "#E879F9");
    ctx.fillStyle = C.muted;
    ctx.font = font(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    ctx.fillStyle = C.muted;
    ctx.font = font(14, "normal");
    ctx.fillText(
      `Messages: ${data.messagesSent.toLocaleString()}  ·  Voice: ${data.voiceMinutes.toLocaleString()} min`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(await canvas.encode("png"), {
      name: "server-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateServerRankBanner:", err);
    return null;
  }
}
