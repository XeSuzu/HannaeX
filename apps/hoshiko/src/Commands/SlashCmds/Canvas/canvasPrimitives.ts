import { GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "fs";
import path from "path";
import type { Attachment, Guild, User } from "discord.js";

function resolveAssetPath(relPath: string): string {
  const local = path.join(__dirname, "../../..", relPath);
  if (existsSync(local)) return local;
  const appSrc = path.join(process.cwd(), "apps/hoshiko/src", relPath);
  if (existsSync(appSrc)) return appSrc;
  const appDist = path.join(process.cwd(), "apps/hoshiko/dist", relPath);
  if (existsSync(appDist)) return appDist;
  return local;
}

let fontsRegistered = false;

export function ensureSocialFontsRegistered(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const fontCandidates: Array<{ paths: string[]; family: string }> = [
    {
      paths: [
        resolveAssetPath("assets/fonts/Nunito-Regular.ttf"),
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
      ],
      family: "SocialSans",
    },
    {
      paths: [
        resolveAssetPath("assets/fonts/Nunito-Bold.ttf"),
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
      ],
      family: "SocialSansBold",
    },
    {
      paths: [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
      ],
      family: "NotoSansCJK",
    },
    {
      paths: ["/usr/share/fonts/truetype/noto/NotoSansSymbols-Regular.ttf"],
      family: "NotoSymbols",
    },
    {
      paths: ["/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf"],
      family: "NotoSymbols2",
    },
    {
      paths: ["/usr/share/fonts/truetype/noto/NotoSansMath-Regular.ttf"],
      family: "NotoMath",
    },
    {
      paths: [
        resolveAssetPath("assets/fonts/NotoColorEmoji.ttf"),
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
      ],
      family: "NotoColorEmoji",
    },
  ];

  for (const entry of fontCandidates) {
    for (const candidate of entry.paths) {
      if (existsSync(candidate)) {
        try {
          GlobalFonts.registerFromPath(candidate, entry.family);
          break;
        } catch {}
      }
    }
  }
}

export const SOCIAL_FONT_STACK =
  '"SocialSans","Noto Sans","NotoSansCJK","NotoSymbols","NotoSymbols2","NotoMath","NotoColorEmoji",sans-serif';

export const SOCIAL_BOLD_FONT_STACK =
  '"SocialSansBold","SocialSans","Noto Sans","NotoSansCJK","NotoSymbols","NotoSymbols2","NotoMath","NotoColorEmoji",sans-serif';

export function getSocialFont(sizePx: number, bold: boolean = false): string {
  ensureSocialFontsRegistered();
  return `${bold ? "bold " : ""}${sizePx}px ${bold ? SOCIAL_BOLD_FONT_STACK : SOCIAL_FONT_STACK}`;
}

export function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

/**
 * Dibuja la insignia de verificado (sello festoneado de 8 puntas estilo Instagram / X)
 * centrada verticalmente en `y` y comenzando horizontalmente en `x`.
 */
export async function drawVerifiedBadge(
  ctx: any,
  x: number,
  y: number,
  scale: number = 1,
  color: string = "#3897f0",
): Promise<number> {
  ctx.save();
  const size = 24 * scale;
  const cx = x + size / 2;
  const cy = y;
  const outerR = size * 0.5;
  const innerR = size * 0.41;
  const points = 8;

  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Checkmark blanco central
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(2, 2.8 * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.2, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.04, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.22, cy - size * 0.16);
  ctx.stroke();
  ctx.restore();
  return size;
}

/**
 * Resuelve menciones de Discord (<@id>, <@&id>, <#id>) a nombres legibles.
 */
export function formatSocialMentions(text: string, guild?: Guild | null): string {
  if (!text) return "";
  return text
    .replace(/<@!?(\d+)>/g, (match, id) => {
      const mem = guild?.members?.cache?.get(id);
      return mem ? `@${mem.displayName}` : "@usuario";
    })
    .replace(/<@&(\d+)>/g, (match, id) => {
      const role = guild?.roles?.cache?.get(id);
      return role ? `@${role.name}` : "@rol";
    })
    .replace(/<#(\d+)>/g, (match, id) => {
      const ch = guild?.channels?.cache?.get(id);
      return ch && "name" in ch ? `#${ch.name}` : "#canal";
    });
}

/**
 * Determina el color de insignia de verificado según el rol/estado del usuario.
 */
export function resolveBadgeColor(
  user: User,
  guild?: Guild | null,
  botUserId?: string,
  memberPremiumSince?: Date | number | null,
): string | null {
  if (process.env.BOT_OWNER_ID && user.id === process.env.BOT_OWNER_ID) {
    return "#D4AF37"; // Propietario del Bot (Dorado)
  }
  if (guild?.ownerId && user.id === guild.ownerId) {
    return "#C0392B"; // Dueño del Servidor (Carmesí)
  }
  const cachedMember = guild?.members?.cache?.get(user.id);
  if (memberPremiumSince || cachedMember?.premiumSince) {
    return "#9B59B6"; // Server Booster (Morado)
  }
  if (botUserId && user.id === botUserId) {
    return "#1D9BF0"; // Bot Oficial (Azul)
  }
  return null;
}

/**
 * Valida que el archivo adjunto sea una imagen soportada por Canvas.
 */
export function isSupportedImageAttachment(attachment?: Attachment | null): boolean {
  if (!attachment) return false;
  const ct = (attachment.contentType || "").toLowerCase();
  if (
    ct.startsWith("image/png") ||
    ct.startsWith("image/jpeg") ||
    ct.startsWith("image/jpg") ||
    ct.startsWith("image/webp")
  ) {
    return true;
  }
  const urlPath = (attachment.name || attachment.url || "").toLowerCase().split("?")[0];
  return /\.(png|jpe?g|webp)$/i.test(urlPath);
}

/**
 * Divide un texto en líneas respetando saltos de línea (\n), palabras completas y
 * partiendo tokens extremadamente largos (ej. URLs) sin desbordar maxWidth.
 * Soporta un desplazamiento inicial en la primera línea (firstLineOffsetX).
 */
export function wrapTextSmart(
  ctx: any,
  text: string,
  maxWidth: number,
  firstLineOffsetX: number = 0,
): string[] {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [""];

  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) {
      lines.push("");
      continue;
    }

    const words = trimmedPara.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const effectiveMax = lines.length === 0 ? Math.max(120, maxWidth - firstLineOffsetX) : maxWidth;
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(candidate).width <= effectiveMax) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      const nextLineMax = lines.length === 0 ? Math.max(120, maxWidth - firstLineOffsetX) : maxWidth;
      if (ctx.measureText(word).width <= nextLineMax) {
        currentLine = word;
      } else {
        // Palabra o URL individual más ancha que la línea: partir por caracteres
        const chars = Array.from(word);
        let chunk = "";
        for (const ch of chars) {
          const limit = lines.length === 0 ? Math.max(120, maxWidth - firstLineOffsetX) : maxWidth;
          if (ctx.measureText(chunk + ch).width > limit && chunk.length > 0) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        currentLine = chunk;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Dibuja una línea de texto coloreando menciones (@user), hashtags (#tag) y enlaces.
 */
export function drawRichSocialLine(
  ctx: any,
  line: string,
  x: number,
  y: number,
  normalColor: string = "#FFFFFF",
  highlightColor: string = "#1D9BF0",
): void {
  if (!line) return;
  const tokens = line.split(/(\s+)/);
  let cursorX = x;

  for (const token of tokens) {
    if (!token) continue;
    const isHighlight = /^(?:@[a-zA-Z0-9_.\u00C0-\u024F-]+|#[a-zA-Z0-9_\u00C0-\u024F]+|https?:\/\/\S+)/i.test(
      token,
    );
    ctx.fillStyle = isHighlight ? highlightColor : normalColor;
    ctx.fillText(token, cursorX, y);
    cursorX += ctx.measureText(token).width;
  }
}

// ============================================================================
// ICONOS VECTORIALES NATIVOS (CERO DESCARGAS DE RED)
// ============================================================================

/**
 * Icono de Corazón (Instagram Like)
 */
export function drawInstaHeartIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#FFFFFF",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const w = size;
  const h = size;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.86);
  ctx.bezierCurveTo(
    x + w * 0.12,
    y + h * 0.62,
    x + w * 0.04,
    y + h * 0.28,
    x + w * 0.27,
    y + h * 0.16,
  );
  ctx.bezierCurveTo(
    x + w * 0.39,
    y + h * 0.1,
    x + w * 0.5,
    y + h * 0.22,
    x + w * 0.5,
    y + h * 0.28,
  );
  ctx.bezierCurveTo(
    x + w * 0.5,
    y + h * 0.22,
    x + w * 0.61,
    y + h * 0.1,
    x + w * 0.73,
    y + h * 0.16,
  );
  ctx.bezierCurveTo(
    x + w * 0.96,
    y + h * 0.28,
    x + w * 0.88,
    y + h * 0.62,
    x + w * 0.5,
    y + h * 0.86,
  );
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Icono de Comentario (Instagram Comment Bubble)
 */
export function drawInstaCommentIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#FFFFFF",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = x + size * 0.5;
  const cy = y + size * 0.48;
  const r = size * 0.38;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0.35 * Math.PI, 1.82 * Math.PI, false);
  ctx.lineTo(x + size * 0.88, y + size * 0.88);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Icono de Compartir / Direct (Avión de papel de Instagram)
 */
export function drawInstaShareIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#FFFFFF",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(x + size * 0.1, y + size * 0.2);
  ctx.lineTo(x + size * 0.9, y + size * 0.2);
  ctx.lineTo(x + size * 0.52, y + size * 0.88);
  ctx.lineTo(x + size * 0.42, y + size * 0.52);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.9, y + size * 0.2);
  ctx.lineTo(x + size * 0.42, y + size * 0.52);
  ctx.stroke();
  ctx.restore();
}

/**
 * Icono de Guardar (Bookmark de Instagram / X)
 */
export function drawInstaBookmarkIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#FFFFFF",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.12);
  ctx.lineTo(x + size * 0.8, y + size * 0.12);
  ctx.lineTo(x + size * 0.8, y + size * 0.88);
  ctx.lineTo(x + size * 0.5, y + size * 0.66);
  ctx.lineTo(x + size * 0.2, y + size * 0.88);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Logo vectorial oficial de X en blanco sobre fondo oscuro (Cero red)
 */
export function drawXLogo(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#FFFFFF",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  // Trazo diagonal principal (doble barra rellena estilo X)
  ctx.beginPath();
  ctx.moveTo(x + size * 0.08, y + size * 0.08);
  ctx.lineTo(x + size * 0.34, y + size * 0.08);
  ctx.lineTo(x + size * 0.92, y + size * 0.92);
  ctx.lineTo(x + size * 0.66, y + size * 0.92);
  ctx.closePath();
  ctx.fill();

  // Trazo diagonal secundario cruzado
  ctx.lineWidth = Math.max(3.5, size * 0.11);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.88, y + size * 0.08);
  ctx.lineTo(x + size * 0.12, y + size * 0.92);
  ctx.stroke();
  ctx.restore();
}

/**
 * Icono de Repost (Flechas cíclicas de X/Twitter)
 */
export function drawXRepostIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#71767B",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Arco superior hacia la derecha
  ctx.beginPath();
  ctx.moveTo(x + size * 0.22, y + size * 0.42);
  ctx.lineTo(x + size * 0.22, y + size * 0.26);
  ctx.lineTo(x + size * 0.78, y + size * 0.26);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.64, y + size * 0.14);
  ctx.lineTo(x + size * 0.8, y + size * 0.26);
  ctx.lineTo(x + size * 0.64, y + size * 0.38);
  ctx.stroke();

  // Arco inferior hacia la izquierda
  ctx.beginPath();
  ctx.moveTo(x + size * 0.78, y + size * 0.58);
  ctx.lineTo(x + size * 0.78, y + size * 0.74);
  ctx.lineTo(x + size * 0.22, y + size * 0.74);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.36, y + size * 0.62);
  ctx.lineTo(x + size * 0.2, y + size * 0.74);
  ctx.lineTo(x + size * 0.36, y + size * 0.86);
  ctx.stroke();

  ctx.restore();
}

/**
 * Icono de Compartir de X (Bandeja con flecha hacia arriba)
 */
export function drawXShareIcon(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string = "#71767B",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Flecha vertical hacia arriba
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size * 0.66);
  ctx.lineTo(x + size * 0.5, y + size * 0.16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.32, y + size * 0.34);
  ctx.lineTo(x + size * 0.5, y + size * 0.16);
  ctx.lineTo(x + size * 0.68, y + size * 0.34);
  ctx.stroke();

  // Bandeja inferior
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.56);
  ctx.lineTo(x + size * 0.2, y + size * 0.84);
  ctx.lineTo(x + size * 0.8, y + size * 0.84);
  ctx.lineTo(x + size * 0.8, y + size * 0.56);
  ctx.stroke();

  ctx.restore();
}
