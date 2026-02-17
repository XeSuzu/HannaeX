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
const boldFont = `bold ${mainFont}`;

const HEADER_H = 160;
const CONTENT_H = 1080;
const FOOTER_H = 310;
const TOTAL_W = 1080;
const TOTAL_H = HEADER_H + CONTENT_H + FOOTER_H;

export default {
  data: new SlashCommandBuilder()
    .setName("post")
    .setDescription("Genera posts de redes sociales.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("instagram")
        .setDescription("📸 Crea un post de Instagram con diseño perfecto.")
        .addStringOption((option) =>
          option
            .setName("texto")
            .setDescription("Pie de foto o texto del estado.")
            .setRequired(true),
        )
        .addAttachmentOption((option) =>
          option
            .setName("imagen")
            .setDescription("Foto para el post (Opcional).")
            .setRequired(false),
        )
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("¿Quién publica esto?")
            .setRequired(false),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    if (interaction.options.getSubcommand() !== "instagram") return;

    await interaction.deferReply({ ephemeral: true });

    let text = interaction.options.getString("texto", true);
    const attachment = interaction.options.getAttachment("imagen");
    const user = interaction.options.getUser("usuario") || interaction.user;

    let badgeColor: string | null = null;
    const member = interaction.guild?.members.cache.get(user.id);

    if (user.id === process.env.BOT_OWNER_ID) badgeColor = "#D4AF37";
    else if (user.id === interaction.guild?.ownerId) badgeColor = "#C0392B";
    else if (member?.premiumSince) badgeColor = "#9B59B6";
    else if (user.id === client.user?.id) badgeColor = "#2980B9";

    text = text
      .replace(/<@!?(\d+)>/g, (m, id) => {
        const mem = interaction.guild?.members.cache.get(id);
        return mem ? `@${mem.displayName}` : m;
      })
      .replace(/<@&(\d+)>/g, "@Rol")
      .replace(/<#(\d+)>/g, "#Canal");

    const canvas = createCanvas(TOTAL_W, TOTAL_H);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

    if (attachment) {
      try {
        const mainImage = await loadImage(attachment.url);
        drawImageCinematicFit(ctx, mainImage, 0, HEADER_H, TOTAL_W, CONTENT_H);
      } catch (e) {
        ctx.fillStyle = "#222";
        ctx.fillRect(0, HEADER_H, TOTAL_W, CONTENT_H);
      }
    } else {
      const gradient = ctx.createLinearGradient(0, 0, TOTAL_W, TOTAL_H);
      gradient.addColorStop(0, "#833ab4");
      gradient.addColorStop(0.5, "#fd1d1d");
      gradient.addColorStop(1, "#fcb045");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, HEADER_H, TOTAL_W, CONTENT_H);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `65px ${boldFont}`;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      wrapText(ctx, text, 540, HEADER_H + CONTENT_H / 2, 940, 85, true);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    try {
      const avatarURL = user.displayAvatarURL({ extension: "png", size: 256 });
      const avatar = await loadImage(avatarURL);
      const cx = 80,
        cy = 80;

      const gradRing = ctx.createLinearGradient(
        cx - 55,
        cy - 55,
        cx + 55,
        cy + 55,
      );
      gradRing.addColorStop(0, "#f09433");
      gradRing.addColorStop(0.5, "#dc2743");
      gradRing.addColorStop(1, "#bc1888");
      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.fillStyle = gradRing;
      ctx.fill();
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.closePath();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, cx - 46, cy - 46, 92, 92);
      ctx.restore();
    } catch (e) {}

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `38px ${boldFont}`;
    ctx.textAlign = "left";
    ctx.fillText(user.username.toLowerCase(), 160, 90);

    if (badgeColor) {
      const nameWidth = ctx.measureText(user.username.toLowerCase()).width;
      await drawVerifiedBadge(ctx, 160 + nameWidth + 12, 73, 1.45, badgeColor);
    }

    ctx.fillStyle = "#FFFFFF";
    const dotsX = 1000,
      dotsY = 80;
    ctx.beginPath();
    ctx.arc(dotsX, dotsY, 4, 0, Math.PI * 2);
    ctx.arc(dotsX + 15, dotsY, 4, 0, Math.PI * 2);
    ctx.arc(dotsX - 15, dotsY, 4, 0, Math.PI * 2);
    ctx.fill();

    const footerStartY = HEADER_H + CONTENT_H + 25;

    const iconURLs = {
      like: "https://cdn-icons-png.flaticon.com/512/1077/1077035.png",
      comment: "https://cdn-icons-png.flaticon.com/512/1380/1380338.png",
      share: "https://cdn-icons-png.flaticon.com/512/929/929610.png",
      save: "https://cdn-icons-png.flaticon.com/512/5662/5662990.png",
    };
    const [likeIcon, commentIcon, shareIcon, saveIcon] = await Promise.all([
      loadImage(iconURLs.like),
      loadImage(iconURLs.comment),
      loadImage(iconURLs.share),
      loadImage(iconURLs.save),
    ]);

    const iconSize = 60;
    ctx.filter = "invert(100%)";
    ctx.drawImage(likeIcon, 35, footerStartY, iconSize, iconSize);
    ctx.drawImage(commentIcon, 130, footerStartY, iconSize, iconSize);
    ctx.drawImage(shareIcon, 230, footerStartY, iconSize, iconSize);
    ctx.drawImage(saveIcon, 980, footerStartY, iconSize, iconSize);
    ctx.filter = "none";

    const textStartY = footerStartY + 90;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `30px ${boldFont}`;
    ctx.fillText(
      `${Math.floor(Math.random() * 5000 + 50).toLocaleString()} Me gusta`,
      35,
      textStartY,
    );

    const captionY = textStartY + 45;

    ctx.font = `30px ${boldFont}`;
    ctx.fillText(user.username.toLowerCase(), 35, captionY);
    const nameWidth = ctx.measureText(user.username.toLowerCase()).width;

    let badgeOffset = 0;
    if (badgeColor) {
      await drawVerifiedBadge(
        ctx,
        35 + nameWidth + 8,
        captionY - 12,
        1.0,
        badgeColor,
      );
      badgeOffset = 35;
    }

    ctx.font = `30px ${mainFont}`;
    const cleanText = text.length > 55 ? text.substring(0, 55) + "..." : text;
    ctx.fillText(cleanText, 35 + nameWidth + 15 + badgeOffset, captionY);

    ctx.fillStyle = "#A8A8A8";
    ctx.font = `28px ${mainFont}`;
    ctx.fillText(
      `Ver los ${Math.floor(Math.random() * 100)} comentarios`,
      35,
      captionY + 45,
    );

    const finalBuffer = await canvas.encode("png");
    const file = new AttachmentBuilder(finalBuffer, {
      name: "insta-fixed.png",
    });
    if (interaction.channel && interaction.channel.isTextBased())
      await (interaction.channel as TextChannel).send({ files: [file] });
    await interaction.editReply({ content: "✅ Post publicado." });
  },
};

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
  return ctx;
}

function drawImageCinematicFit(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;

  ctx.save();
  ctx.filter = "blur(40px) brightness(0.6) saturate(1.3)";
  ctx.drawImage(img, x - 50, y - 50, w + 100, h + 100);
  ctx.restore();

  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.max(w, h) * 0.8;
  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0.1)");
  vignette.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);

  let drawW, drawH, drawX, drawY;
  if (imgRatio > canvasRatio) {
    drawW = w;
    drawH = w / imgRatio;
    drawX = x;
    drawY = y + (h - drawH) / 2;
  } else {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x + (w - drawW) / 2;
    drawY = y;
  }

  const margin = 30;
  drawX += margin;
  drawY += margin;
  drawW -= margin * 2;
  drawH -= margin * 2;
  const cornerRadius = 35;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, drawX, drawY, drawW, drawH, cornerRadius);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
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

function wrapText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  centered: boolean,
) {
  const words = Array.from(text);
  let line = "";
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  if (centered) {
    y -= (lines.length * lineHeight) / 2;
    ctx.textAlign = "center";
  } else {
    ctx.textAlign = "left";
  }
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  ctx.textAlign = "left";
}
