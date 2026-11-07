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
import type { VCRankData } from "./types";

export async function generateVCRankBanner(
  data: VCRankData,
): Promise<AttachmentBuilder | null> {
  if (!getCanvasLibrary()) return null;
  try {
    const ringColor =
      data.vcRank === 1
        ? "#22D3EE"
        : data.vcRank <= 3
          ? "#38BDF8"
          : data.vcRank <= 10
            ? "#06B6D4"
            : "rgba(103,232,249,0.85)";

    const { canvas, ctx } = await createBaseCanvas(
      data.avatarBuffer,
      data.backgroundTheme,
      ringColor,
      data.customBackgroundBuffer,
    );
    const panelTop = data.panelTopText || "VOZ";
    const panelBottom = data.panelBottomText || "SERVIDOR";
    drawPanel(ctx, `#${data.vcRank}`, panelTop, panelBottom, C.cyanGlow);

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

    const prefix = data.levelPrefix ? `${data.levelPrefix} Voz` : "Voice Level";
    ctx.fillStyle = C.cyan;
    ctx.font = font(25, "normal");
    ctx.fillText(`${prefix} ${data.voiceLevel}`, L.info.x, L.levelY);

    const hours = Math.floor(data.voiceMinutes / 60);
    const minutes = data.voiceMinutes % 60;
    const timeText = hours > 0
      ? `${hours}h ${minutes}m in voice`
      : `${minutes}m in voice`;
    ctx.fillStyle = C.muted;
    ctx.font = font(15, "normal");
    ctx.fillText(timeText, L.info.x, L.subY);

    drawBar(ctx, data.progressPercent, "#06B6D4", "#38BDF8");
    ctx.fillStyle = C.muted;
    ctx.font = font(17, "normal");
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} Voice XP  (${data.progressPercent}%)`,
      L.info.x,
      L.xpY,
    );

    ctx.fillStyle = C.muted;
    ctx.font = font(14, "normal");
    ctx.fillText(
      `Voice: ${data.voiceMinutes.toLocaleString()} minutes total`,
      L.info.x,
      L.statsY,
    );

    return new AttachmentBuilder(await canvas.encode("png"), {
      name: "vc-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateVCRankBanner:", err);
    return null;
  }
}
