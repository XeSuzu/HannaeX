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
    const { canvas, ctx } = await createBaseCanvas(data.avatarBuffer);
    drawPanel(ctx, `#${data.rank}`, "in", "server", C.goldGlow);

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
    ctx.fillText(`Level ${data.level}`, L.info.x, L.levelY);

    if (data.globalLevel !== undefined) {
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

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "server-rank.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateServerRankBanner:", err);
    return null;
  }
}
