import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  drawInstaBookmarkIcon,
  drawInstaCommentIcon,
  drawInstaHeartIcon,
  drawRichSocialLine,
  drawVerifiedBadge,
  drawXLogo,
  drawXRepostIcon,
  drawXShareIcon,
  ensureSocialFontsRegistered,
  getSocialFont,
  roundRect,
  wrapTextSmart,
} from "./canvasPrimitives";

export interface TwitterRenderOptions {
  text: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  badgeColor: string | null;
  attachmentUrl: string | null;
}

const WIDTH = 1080;
const PADDING = 60;
const CONTENT_W = WIDTH - PADDING * 2;
const LINE_HEIGHT = 72;

export async function generateTwitterPost(options: TwitterRenderOptions): Promise<Buffer> {
  ensureSocialFontsRegistered();

  const {
    text,
    displayName,
    username,
    avatarUrl,
    badgeColor,
    attachmentUrl,
  } = options;

  // 1. Medir líneas de texto respetando saltos de línea y palabras largas
  const measureCanvas = createCanvas(WIDTH, 100);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = getSocialFont(50, false);

  const lines = wrapTextSmart(measureCtx, text, CONTENT_W, 0);
  const textHeight = Math.max(1, lines.length) * LINE_HEIGHT;

  // 2. Cargar y calcular dimensiones de la imagen adjunta (si existe)
  let imgHeight = 0;
  let loadedImg: any = null;

  if (attachmentUrl) {
    try {
      loadedImg = await loadImage(attachmentUrl);
      const ratio = loadedImg.height / loadedImg.width;
      imgHeight = Math.round(CONTENT_W * ratio);
      if (imgHeight < 340) imgHeight = 340;
      if (imgHeight > 1150) imgHeight = 1150;
    } catch {
      loadedImg = null;
      imgHeight = 0;
    }
  }

  const headerH = 225;
  const footerH = 305;
  const imgBlockH = loadedImg ? imgHeight + 44 : 16;
  const totalHeight = headerH + textHeight + imgBlockH + footerH;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  // 3. Fondo negro X Dark Mode
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  // 4. Header: Avatar circular + Display Name + Insignia + @handle + Logo X vectorial blanco
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(PADDING + 52, PADDING + 52, 52, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, PADDING, PADDING, 104, 104);
    ctx.restore();
  } catch {}

  const rawDisplayName = (displayName || username || "Usuario").trim();
  const safeDisplayName =
    rawDisplayName.length > 26 ? rawDisplayName.slice(0, 25) + "…" : rawDisplayName;
  const cleanHandle = `@${(username || "usuario").toLowerCase()}`;

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = getSocialFont(42, true);
  const nameBaselineY = PADDING + 46;
  ctx.fillText(safeDisplayName, PADDING + 126, nameBaselineY);

  if (badgeColor) {
    const nameWidth = ctx.measureText(safeDisplayName).width;
    await drawVerifiedBadge(
      ctx,
      PADDING + 126 + nameWidth + 10,
      nameBaselineY - 14,
      1.3,
      badgeColor,
    );
  }

  ctx.fillStyle = "#71767B";
  ctx.font = getSocialFont(35, false);
  ctx.fillText(cleanHandle, PADDING + 126, PADDING + 94);

  // Logo X vectorial en blanco (visible sobre el fondo #000000 y sin llamadas a Wikipedia)
  drawXLogo(ctx, WIDTH - PADDING - 48, PADDING + 12, 48, "#FFFFFF");

  // 5. Cuerpo del Tweet (con resaltado de @menciones, #hashtags y enlaces en azul #1D9BF0)
  let currentY = headerH;
  ctx.font = getSocialFont(50, false);

  for (const line of lines) {
    if (line.trim().length > 0) {
      drawRichSocialLine(ctx, line, PADDING, currentY, "#FFFFFF", "#1D9BF0");
    }
    currentY += LINE_HEIGHT;
  }

  // 6. Imagen adjunta con bordes redondeados y marco sutil
  if (loadedImg) {
    currentY += 12;
    ctx.save();
    roundRect(ctx, PADDING, currentY, CONTENT_W, imgHeight, 28);
    ctx.clip();
    drawImageCover(ctx, loadedImg, PADDING, currentY, CONTENT_W, imgHeight);
    ctx.restore();

    ctx.save();
    roundRect(ctx, PADDING, currentY, CONTENT_W, imgHeight, 28);
    ctx.strokeStyle = "#2F3336";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    currentY += imgHeight + 54;
  } else {
    currentY += 24;
  }

  // 7. Línea de metadatos: Hora · Fecha · Views · Twitter for iPhone
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const metaPrefix = `${timeStr} · ${dateStr} · `;
  ctx.fillStyle = "#71767B";
  ctx.font = getSocialFont(34, false);
  ctx.fillText(metaPrefix, PADDING, currentY);
  let metaCursorX = PADDING + ctx.measureText(metaPrefix).width;

  const viewsNum = `${(Math.random() * 85 + 4.2).toFixed(1)}K`;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = getSocialFont(34, true);
  ctx.fillText(viewsNum, metaCursorX, currentY);
  metaCursorX += ctx.measureText(viewsNum).width;

  ctx.fillStyle = "#71767B";
  ctx.font = getSocialFont(34, false);
  const viewsSuffix = " Views · ";
  ctx.fillText(viewsSuffix, metaCursorX, currentY);
  metaCursorX += ctx.measureText(viewsSuffix).width;

  ctx.fillStyle = "#1D9BF0";
  ctx.fillText("Twitter for iPhone", metaCursorX, currentY);

  // Separador 1
  currentY += 42;
  ctx.strokeStyle = "#2F3336";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PADDING, currentY);
  ctx.lineTo(WIDTH - PADDING, currentY);
  ctx.stroke();

  // 8. Fila de estadísticas: Reposts, Quotes, Likes, Bookmarks
  currentY += 54;
  const stats = [
    { value: Math.floor(Math.random() * 3500 + 25).toLocaleString("en-US"), label: "Reposts" },
    { value: Math.floor(Math.random() * 420 + 5).toLocaleString("en-US"), label: "Quotes" },
    { value: Math.floor(Math.random() * 18000 + 120).toLocaleString("en-US"), label: "Likes" },
    { value: Math.floor(Math.random() * 900 + 10).toLocaleString("en-US"), label: "Bookmarks" },
  ];

  let statX = PADDING;
  for (const st of stats) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = getSocialFont(34, true);
    ctx.fillText(st.value, statX, currentY);
    statX += ctx.measureText(st.value).width + 10;

    ctx.fillStyle = "#71767B";
    ctx.font = getSocialFont(34, false);
    ctx.fillText(st.label, statX, currentY);
    statX += ctx.measureText(st.label).width + 38;
  }

  // Separador 2
  currentY += 38;
  ctx.strokeStyle = "#2F3336";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PADDING, currentY);
  ctx.lineTo(WIDTH - PADDING, currentY);
  ctx.stroke();

  // 9. Barra inferior de iconos de interacción de X (Reply, Repost, Like, Bookmark, Share)
  const iconY = currentY + 26;
  const iconSize = 44;
  const stepX = (CONTENT_W - iconSize) / 4;

  drawInstaCommentIcon(ctx, PADDING + stepX * 0, iconY, iconSize, "#71767B");
  drawXRepostIcon(ctx, PADDING + stepX * 1, iconY, iconSize, "#71767B");
  drawInstaHeartIcon(ctx, PADDING + stepX * 2, iconY, iconSize, "#71767B");
  drawInstaBookmarkIcon(ctx, PADDING + stepX * 3, iconY, iconSize, "#71767B");
  drawXShareIcon(ctx, PADDING + stepX * 4, iconY, iconSize, "#71767B");

  return canvas.encode("png");
}

function drawImageCover(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let renderW: number;
  let renderH: number;
  let offsetX: number;
  let offsetY: number;

  if (imgRatio < canvasRatio) {
    renderW = w;
    renderH = w / imgRatio;
    offsetX = 0;
    offsetY = (h - renderH) / 2;
  } else {
    renderH = h;
    renderW = h * imgRatio;
    offsetX = (w - renderW) / 2;
    offsetY = 0;
  }
  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
}
