import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  drawInstaBookmarkIcon,
  drawInstaCommentIcon,
  drawInstaHeartIcon,
  drawInstaShareIcon,
  drawRichSocialLine,
  drawVerifiedBadge,
  ensureSocialFontsRegistered,
  getSocialFont,
  roundRect,
  wrapTextSmart,
} from "./canvasPrimitives";

const HEADER_H = 160;
const CONTENT_H = 1080;
const TOTAL_W = 1080;
const PADDING_X = 36;
const MAX_CAPTION_LINES = 4;
const CAPTION_LINE_H = 42;

export async function generateInstaPost(
  text: string,
  username: string,
  avatarUrl: string,
  badgeColor: string | null,
  attachmentUrl: string | null,
): Promise<Buffer> {
  ensureSocialFontsRegistered();

  const handle = (username || "usuario").toLowerCase();

  // 1. Pre-medir el pie de foto para calcular altura dinámica del footer
  const measureCanvas = createCanvas(TOTAL_W, 100);
  const mCtx = measureCanvas.getContext("2d");

  mCtx.font = getSocialFont(30, true);
  const handleWidth = mCtx.measureText(handle).width;
  const badgeReserve = badgeColor ? 34 : 0;
  const firstLineOffset = handleWidth + badgeReserve + 14;

  mCtx.font = getSocialFont(30, false);
  const maxCaptionWidth = TOTAL_W - PADDING_X * 2;
  let captionLines = wrapTextSmart(mCtx, text, maxCaptionWidth, firstLineOffset);
  if (captionLines.length > MAX_CAPTION_LINES) {
    captionLines = captionLines.slice(0, MAX_CAPTION_LINES);
    const lastIdx = captionLines.length - 1;
    captionLines[lastIdx] = captionLines[lastIdx].replace(/\s+\S*$/, "") + "... más";
  }

  const extraCaptionHeight = Math.max(0, captionLines.length - 1) * CAPTION_LINE_H;
  const footerH = 335 + extraCaptionHeight;
  const totalH = HEADER_H + CONTENT_H + footerH;

  const canvas = createCanvas(TOTAL_W, totalH);
  const ctx = canvas.getContext("2d");

  // 2. Fondo general negro puro (Instagram Dark Mode)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TOTAL_W, totalH);

  // 3. Área principal (1080x1080): Imagen adjunta o Tarjeta de Cita con Gradiente
  let imageLoaded = false;
  if (attachmentUrl) {
    try {
      const mainImage = await loadImage(attachmentUrl);
      drawImageCinematicFit(ctx, mainImage, 0, HEADER_H, TOTAL_W, CONTENT_H);
      imageLoaded = true;
    } catch {
      imageLoaded = false;
    }
  }

  if (!imageLoaded) {
    const gradient = ctx.createLinearGradient(0, HEADER_H, TOTAL_W, HEADER_H + CONTENT_H);
    gradient.addColorStop(0, "#833ab4");
    gradient.addColorStop(0.5, "#fd1d1d");
    gradient.addColorStop(1, "#fcb045");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, HEADER_H, TOTAL_W, CONTENT_H);

    // Sombra radial sutil para mejorar contraste de lectura
    const overlay = ctx.createRadialGradient(
      TOTAL_W / 2,
      HEADER_H + CONTENT_H / 2,
      100,
      TOTAL_W / 2,
      HEADER_H + CONTENT_H / 2,
      760,
    );
    overlay.addColorStop(0, "rgba(0,0,0,0.08)");
    overlay.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, HEADER_H, TOTAL_W, CONTENT_H);

    drawCenteredQuoteCard(ctx, text, HEADER_H, TOTAL_W, CONTENT_H);
  }

  // 4. Header: Avatar con aro degradado de Historia + Username + Insignia + Menú
  try {
    const avatar = await loadImage(avatarUrl);
    const cx = 82;
    const cy = 80;
    const gradRing = ctx.createLinearGradient(cx - 56, cy + 56, cx + 56, cy - 56);
    gradRing.addColorStop(0, "#f09433");
    gradRing.addColorStop(0.25, "#e6683c");
    gradRing.addColorStop(0.5, "#dc2743");
    gradRing.addColorStop(0.75, "#cc2366");
    gradRing.addColorStop(1, "#bc1888");

    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.fillStyle = gradRing;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 49, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, cx - 45, cy - 45, 90, 90);
    ctx.restore();
  } catch {}

  ctx.fillStyle = "#FFFFFF";
  ctx.font = getSocialFont(36, true);
  ctx.textAlign = "left";
  const headerNameY = 92;
  ctx.fillText(handle, 160, headerNameY);

  if (badgeColor) {
    const headerNameW = ctx.measureText(handle).width;
    await drawVerifiedBadge(ctx, 160 + headerNameW + 12, headerNameY - 12, 1.35, badgeColor);
  }

  // Tres puntos horizontales de opciones
  ctx.fillStyle = "#FFFFFF";
  const dotsX = 1015;
  const dotsY = 80;
  for (const dx of [-16, 0, 16]) {
    ctx.beginPath();
    ctx.arc(dotsX + dx, dotsY, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Footer: Iconos vectoriales nativos (0 descargas externas)
  const footerStartY = HEADER_H + CONTENT_H + 26;
  const iconSize = 54;

  drawInstaHeartIcon(ctx, PADDING_X, footerStartY, iconSize, "#FFFFFF");
  drawInstaCommentIcon(ctx, PADDING_X + 90, footerStartY, iconSize, "#FFFFFF");
  drawInstaShareIcon(ctx, PADDING_X + 180, footerStartY, iconSize, "#FFFFFF");
  drawInstaBookmarkIcon(ctx, TOTAL_W - PADDING_X - iconSize, footerStartY, iconSize, "#FFFFFF");

  // Contador de Me gusta
  const likesY = footerStartY + 94;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = getSocialFont(30, true);
  const likesCount = Math.floor(Math.random() * 4950 + 50).toLocaleString("en-US");
  ctx.fillText(`${likesCount} Me gusta`, PADDING_X, likesY);

  // 6. Pie de foto multilínea con handle + insignia + texto enriquecido (@menciones / #hashtags)
  const firstCaptionY = likesY + 46;
  ctx.font = getSocialFont(30, true);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(handle, PADDING_X, firstCaptionY);

  let badgeOffset = 0;
  if (badgeColor) {
    await drawVerifiedBadge(
      ctx,
      PADDING_X + handleWidth + 8,
      firstCaptionY - 10,
      1.0,
      badgeColor,
    );
    badgeOffset = 34;
  }

  ctx.font = getSocialFont(30, false);
  captionLines.forEach((line, idx) => {
    const lineX = idx === 0 ? PADDING_X + handleWidth + badgeOffset + 14 : PADDING_X;
    const lineY = firstCaptionY + idx * CAPTION_LINE_H;
    drawRichSocialLine(ctx, line, lineX, lineY, "#F5F5F5", "#E0F1FF");
  });

  // 7. Comentarios y marca temporal
  const commentsY = firstCaptionY + captionLines.length * CAPTION_LINE_H + 6;
  ctx.fillStyle = "#A8A8A8";
  ctx.font = getSocialFont(27, false);
  const commentsCount = Math.floor(Math.random() * 95 + 5);
  ctx.fillText(`Ver los ${commentsCount} comentarios`, PADDING_X, commentsY);

  ctx.font = getSocialFont(21, false);
  ctx.fillStyle = "#737373";
  ctx.fillText("HACE UNOS MOMENTOS", PADDING_X, commentsY + 36);

  return canvas.encode("png");
}

function drawCenteredQuoteCard(
  ctx: any,
  text: string,
  topY: number,
  w: number,
  h: number,
): void {
  const len = (text || "").length;
  const fontSize = len <= 90 ? 60 : len <= 200 ? 48 : 38;
  const lineHeight = Math.round(fontSize * 1.35);
  const maxWidth = w - 160;
  const maxLines = Math.floor((h - 180) / lineHeight);

  ctx.save();
  ctx.font = getSocialFont(fontSize, true);
  let lines = wrapTextSmart(ctx, text, maxWidth, 0);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s+\S*$/, "") + "...";
  }

  const totalTextH = lines.length * lineHeight;
  let startY = topY + (h - totalTextH) / 2 + fontSize * 0.8;

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  for (const line of lines) {
    ctx.fillText(line, w / 2, startY);
    startY += lineHeight;
  }
  ctx.restore();
}

function drawImageCinematicFit(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;

  // Si la imagen es casi cuadrada (entre 0.85 y 1.18), llenar el cuadro 1080x1080 limpio
  if (imgRatio >= 0.85 && imgRatio <= 1.18) {
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
    ctx.restore();
    return;
  }

  // Para imágenes muy panorámicas o muy verticales, fondo desenfocado + foto completa con bordes suaves
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = "blur(32px) brightness(0.55) saturate(1.25)";
  ctx.drawImage(img, x - 40, y - 40, w + 80, h + 80);
  ctx.filter = "none";

  const vignette = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    0,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0.08)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (imgRatio > canvasRatio) {
    drawW = w - 48;
    drawH = drawW / imgRatio;
    drawX = x + 24;
    drawY = y + (h - drawH) / 2;
  } else {
    drawH = h - 48;
    drawW = drawH * imgRatio;
    drawX = x + (w - drawW) / 2;
    drawY = y + 24;
  }

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, drawX, drawY, drawW, drawH, 28);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}
