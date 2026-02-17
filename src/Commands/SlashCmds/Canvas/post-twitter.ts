import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  TextChannel,
} from "discord.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { HoshikoClient } from "../../../index";
import path from "path";

const fontPath = "./assets/fonts/";
try {
  GlobalFonts.registerFromPath(
    path.join(fontPath, "NotoColorEmoji.ttf"),
    "NotoColorEmoji",
  );
} catch (e) {}

const mainFont = 'Arial, "NotoColorEmoji", sans-serif';

export default {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("🐦 Crea un tweet (X) con diseño limpio y sin errores.")
    .addStringOption((o) =>
      o
        .setName("texto")
        .setDescription("¿Qué estás pensando?")
        .setRequired(true),
    )
    .addAttachmentOption((o) =>
      o
        .setName("imagen")
        .setDescription("Foto para el tweet")
        .setRequired(false),
    )
    .addUserOption((o) =>
      o.setName("usuario").setDescription("¿Quién publica?").setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const text = interaction.options.getString("texto", true);
    const attachment = interaction.options.getAttachment("imagen");
    const user = interaction.options.getUser("usuario") || interaction.user;

    // --- 1. CONFIGURACIÓN DEL LIENZO ---
    const width = 1080;
    const padding = 60;

    // Medir texto
    const measureCanvas = createCanvas(width, 100);
    const measureCtx = measureCanvas.getContext("2d");
    measureCtx.font = `55px ${mainFont}`;

    const lines = wrapTextLines(measureCtx, text, width - padding * 2);
    const lineHeight = 75;
    const textHeight = lines.length * lineHeight;

    // Medir imagen
    let imgHeight = 0;
    let loadedImg = null;

    if (attachment) {
      try {
        loadedImg = await loadImage(attachment.url);
        const ratio = loadedImg.height / loadedImg.width;
        imgHeight = (width - padding * 2) * ratio;
        if (imgHeight > 1200) imgHeight = 1200; // Límite max
      } catch (e) {
        console.error("Error cargando imagen:", e);
      }
    }

    const headerH = 250;
    const statsH = 250;
    const spacing = 40;

    const totalHeight =
      headerH + textHeight + (loadedImg ? imgHeight + spacing : 0) + statsH;

    // --- 2. DIBUJAR ---
    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, totalHeight);

    // Header (Avatar)
    try {
      const avatar = await loadImage(
        user.displayAvatarURL({ extension: "png", size: 256 }),
      );
      ctx.save();
      ctx.beginPath();
      ctx.arc(padding + 50, padding + 50, 50, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, padding, padding, 100, 100);
      ctx.restore();
    } catch (e) {}

    const cleanName = user.username;

    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 45px ${mainFont}`;
    ctx.fillText(cleanName, padding + 120, padding + 50);

    // INSIGNIA
    let badgeColor = null;
    if (user.id === process.env.BOT_OWNER_ID)
      badgeColor = "#D4AF37"; // Owner
    else if (user.id === interaction.guild?.ownerId)
      badgeColor = "#C0392B"; // Server Owner
    else if (user.id === client.user?.id) badgeColor = "#2980B9"; // Bot

    if (badgeColor) {
      const nameWidth = ctx.measureText(cleanName).width;
      await drawVerifiedBadge(
        ctx,
        padding + 120 + nameWidth + 10,
        padding + 25,
        1.2,
        badgeColor,
      );
    }

    // HANDLE (@usuario)
    ctx.fillStyle = "#71767B";
    ctx.font = `40px ${mainFont}`;
    ctx.fillText(`@${cleanName}`, padding + 120, padding + 100);

    // Logo X
    try {
      const logo = await loadImage(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/X_logo_2023_original.svg/1200px-X_logo_2023_original.svg.png",
      );
      ctx.drawImage(logo, width - padding - 50, padding + 10, 50, 50);
    } catch (e) {}

    let currentY = headerH;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `55px ${mainFont}`;

    lines.forEach((line) => {
      // Ajustamos un poco la Y para que sea la línea base
      ctx.fillText(line, padding, currentY);
      currentY += lineHeight;
    });

    // --- IMAGEN ---
    if (loadedImg) {
      currentY += 20;
      const imgW = width - padding * 2;

      ctx.save();
      roundRect(ctx, padding, currentY, imgW, imgHeight, 30);
      ctx.clip();
      drawImageCover(ctx, loadedImg, padding, currentY, imgW, imgHeight);

      ctx.strokeStyle = "#333639";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      currentY += imgHeight + 40;
    } else {
      currentY += 20;
    }

    // --- METADATA ---
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

    ctx.fillStyle = "#71767B";
    ctx.font = `38px ${mainFont}`;
    ctx.fillText(`${timeStr} · ${dateStr} · `, padding, currentY);

    const dateWidth = ctx.measureText(`${timeStr} · ${dateStr} · `).width;
    ctx.fillStyle = "#1D9BF0";
    ctx.fillText("Twitter for iPhone", padding + dateWidth, currentY);

    currentY += 60;
    ctx.strokeStyle = "#2F3336";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();
    currentY += 50;

    // --- STATS ---
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 38px ${mainFont}`;
    const rt = Math.floor(Math.random() * 5000).toLocaleString();
    ctx.fillText(rt, padding, currentY);
    const rtW = ctx.measureText(rt).width;

    ctx.fillStyle = "#71767B";
    ctx.font = `38px ${mainFont}`;
    ctx.fillText("Retweets", padding + rtW + 10, currentY);

    const nextX = padding + rtW + 10 + ctx.measureText("Retweets").width + 30;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 38px ${mainFont}`;
    const likes = Math.floor(Math.random() * 20000).toLocaleString();
    ctx.fillText(likes, nextX, currentY);
    const likesW = ctx.measureText(likes).width;

    ctx.fillStyle = "#71767B";
    ctx.font = `38px ${mainFont}`;
    ctx.fillText("Likes", nextX + likesW + 10, currentY);

    currentY += 40;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();

    // --- ENVÍO ---
    const buffer = await canvas.encode("png");
    const file = new AttachmentBuilder(buffer, { name: "tweet.png" });
    if (interaction.channel?.isTextBased())
      await (interaction.channel as TextChannel).send({ files: [file] });
    await interaction.editReply({ content: "✅ Tweet publicado." });
  },
};

function wrapTextLines(ctx: any, text: string, maxWidth: number) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  return lines;
}

function drawImageCover(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let renderW, renderH, offsetX, offsetY;
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

function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

async function drawVerifiedBadge(
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
