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
} from "./canvas";
import type { LevelUpBannerData } from "./types";

// Micro-caché LRU para buffers de avatares (TTL 10 minutos)
const avatarBufferCache = new Map<
  string,
  { buffer: Buffer; expiresAt: number }
>();

export async function fetchAvatarBuffer(
  avatarUrl: string,
): Promise<Buffer | null> {
  const cached = avatarBufferCache.get(avatarUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.buffer;
  }

  try {
    const res = await fetch(avatarUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Evita crecimiento desmedido de la caché
    if (avatarBufferCache.size > 200) {
      const oldestKey = avatarBufferCache.keys().next().value;
      if (oldestKey) avatarBufferCache.delete(oldestKey);
    }

    avatarBufferCache.set(avatarUrl, {
      buffer,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return buffer;
  } catch {
    return null;
  }
}

function replaceVariables(
  template: string,
  vars: {
    user: string;
    level: number;
    oldLevel: number;
    role?: string | null;
    guildName: string;
  },
): string {
  return template
    .replace(/\{user\}/gi, vars.user)
    .replace(/\{level\}/gi, vars.level.toString())
    .replace(/\{oldLevel\}/gi, vars.oldLevel.toString())
    .replace(/\{role\}/gi, vars.role || "Nuevo Rol")
    .replace(/\{guildName\}/gi, vars.guildName);
}

export async function generateLevelUpBanner(
  data: LevelUpBannerData,
): Promise<AttachmentBuilder | null> {
  const canvasLib = getCanvasLibrary();
  if (!canvasLib) return null;

  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;
    registerFonts(GlobalFonts);

    const W = 820;
    const H = 250;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // 1. Fondo (tema o fondo personalizado)
    const preset = resolveCardBackgroundTheme(data.backgroundTheme);
    let customBg: any = null;
    if (data.customBackgroundBuffer) {
      customBg = await loadImage(data.customBackgroundBuffer).catch(() => null);
    }

    if (customBg) {
      const cw = W;
      const ch = H;
      const iw = customBg.width || W;
      const ih = customBg.height || H;
      const canvasRatio = cw / ch;
      const imgRatio = iw / ih;
      let sx = 0,
        sy = 0,
        sw = iw,
        sh = ih;
      if (imgRatio > canvasRatio) {
        sw = ih * canvasRatio;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / canvasRatio;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(customBg, sx, sy, sw, sh, 0, 0, cw, ch);
      ctx.fillStyle = "rgba(10, 6, 22, 0.50)";
      ctx.fillRect(0, 0, W, H);
    } else if (preset.type === "gradient" && preset.colors) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(0.55, preset.colors[1]);
      grad.addColorStop(1, preset.colors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      if (preset.accentGlow) {
        const glow = ctx.createRadialGradient(
          W * 0.8,
          H * 0.3,
          10,
          W * 0.8,
          H * 0.3,
          250,
        );
        glow.addColorStop(0, preset.accentGlow);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = "#140a24";
      ctx.fillRect(0, 0, W, H);
    }

    // Degradados estéticos para legibilidad
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, "rgba(10, 6, 22, 0.20)");
    overlay.addColorStop(1, "rgba(20, 8, 40, 0.65)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // Borde exterior frosted glass
    ctx.save();
    rrPath(ctx, 4, 4, W - 8, H - 8, 18);
    ctx.strokeStyle = data.isMilestone
      ? "rgba(255, 215, 0, 0.40)"
      : "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. Avatar circular con halo
    let avatarImg: any = null;
    try {
      if (data.avatarBuffer && data.avatarBuffer.length > 0) {
        avatarImg = await loadImage(data.avatarBuffer);
      }
    } catch {
      avatarImg = null;
    }

    const avX = 75;
    const avY = 120;
    const avR = 56;
    const ringColor = data.isMilestone ? C.gold : "#E879F9";

    // Halo
    ctx.save();
    shadow(ctx, 18, data.isMilestone ? C.goldGlow : "rgba(232,121,249,0.35)");
    ctx.beginPath();
    ctx.arc(avX, avY, avR + 5, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();
    ctx.restore();

    // Borde interno
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 8, 30, 0.70)";
    ctx.fill();
    ctx.restore();

    // Imagen del avatar recortada
    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, avX - avR, avY - avR, avR * 2, avR * 2);
      ctx.restore();
    }

    // 3. Procesamiento de variables de texto editables
    const vars = {
      user: data.username,
      level: data.newLevel,
      oldLevel: data.oldLevel,
      role: data.roleName || null,
      guildName: data.guildName,
    };

    const titleText = replaceVariables(
      data.title || "¡NIVEL ALCANZADO!",
      vars,
    );
    const subtitleText = replaceVariables(
      data.subtitle || "¡Felicidades {user} por tu nuevo nivel!",
      vars,
    );
    const badgeText = replaceVariables(
      data.badgeText || (data.isMilestone ? "⭐ HITO ALCANZADO" : "SUBIDA DE RANGO"),
      vars,
    );
    const footerText = replaceVariables(
      data.footerText || "{guildName} • Hoshiko Levels",
      vars,
    );
    const levelPrefix = data.levelPrefix || "NIVEL";

    // 4. Medalla / Insignia superior derecha
    const badgeW = 200;
    const badgeH = 34;
    const badgeX = W - badgeW - 24;
    const badgeY = 22;

    ctx.save();
    rrPath(ctx, badgeX, badgeY, badgeW, badgeH, 17);
    ctx.fillStyle = data.isMilestone
      ? "rgba(255, 215, 0, 0.16)"
      : "rgba(232, 121, 249, 0.15)";
    ctx.fill();
    ctx.strokeStyle = data.isMilestone
      ? "rgba(255, 215, 0, 0.45)"
      : "rgba(232, 121, 249, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = font(12, "bold");
    ctx.fillStyle = data.isMilestone ? C.gold : "#E879F9";
    ctx.fillText(badgeText.toUpperCase(), badgeX + badgeW / 2, badgeY + 22);
    ctx.restore();

    // 5. Textos principales
    const textStartX = 155;
    const maxTextW = badgeX - textStartX - 20;

    // Título Principal
    const { font: titleFont, text: fittedTitle } = fitText(
      ctx,
      titleText,
      maxTextW,
      28,
      18,
      "bold",
    );
    shadow(ctx, 12, data.isMilestone ? C.goldGlow : "rgba(232,213,255,0.25)");
    ctx.fillStyle = data.isMilestone ? C.gold : C.white;
    ctx.font = titleFont;
    ctx.textAlign = "left";
    ctx.fillText(fittedTitle, textStartX, 52);
    noShadow(ctx);

    // Subtítulo / Felicitación
    const { font: subFont, text: fittedSub } = fitText(
      ctx,
      subtitleText,
      maxTextW + 180,
      17,
      13,
      "normal",
    );
    ctx.fillStyle = C.lav;
    ctx.font = subFont;
    ctx.fillText(fittedSub, textStartX, 84);

    // 6. Cápsula de Transición de Nivel
    // [ Nivel X  ➔  NIVEL Y ]
    const capX = textStartX;
    const capY = 108;
    const capW = 270;
    const capH = 46;

    ctx.save();
    rrPath(ctx, capX, capY, capW, capH, 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.font = font(14, "normal");
    ctx.fillText(`Nivel ${data.oldLevel}`, capX + 16, capY + 28);

    ctx.fillStyle = data.isMilestone ? C.gold : C.cyan;
    ctx.font = font(16, "bold");
    ctx.fillText("➔", capX + 90, capY + 29);

    shadow(ctx, 10, data.isMilestone ? C.goldGlow : C.cyanGlow);
    ctx.fillStyle = data.isMilestone ? C.gold : C.white;
    ctx.font = font(18, "bold");
    ctx.fillText(
      `${levelPrefix.toUpperCase()} ${data.newLevel}`,
      capX + 120,
      capY + 30,
    );
    noShadow(ctx);
    ctx.restore();

    // 7. Rol Desbloqueado (si existe)
    if (data.roleName) {
      const roleBadgeX = capX + capW + 16;
      const roleBadgeW = W - roleBadgeX - 24;
      const roleBadgeH = capH;

      ctx.save();
      rrPath(ctx, roleBadgeX, capY, roleBadgeW, roleBadgeH, 12);
      ctx.fillStyle = "rgba(168, 85, 247, 0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#D8B4FE";
      ctx.font = font(12, "bold");
      ctx.fillText("🎖️ ROL DESBLOQUEADO", roleBadgeX + 14, capY + 20);

      const { font: rf, text: rt } = fitText(
        ctx,
        `@${data.roleName}`,
        roleBadgeW - 28,
        15,
        12,
        "bold",
      );
      ctx.fillStyle = C.white;
      ctx.font = rf;
      ctx.fillText(rt, roleBadgeX + 14, capY + 38);
      ctx.restore();
    }

    // 8. Barra inferior / Footer con texto editable
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(textStartX, 185);
    ctx.lineTo(W - 24, 185);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.muted;
    ctx.font = font(13, "normal");
    ctx.fillText(footerText, textStartX, 212);

    ctx.textAlign = "right";
    ctx.font = font(12, "bold");
    ctx.fillStyle = data.isMilestone ? C.gold : C.lavFaded;
    ctx.fillText(
      data.isMilestone ? "⭐ HITO DE EXPERIENCIA" : "EXP • HOSHIKO",
      W - 24,
      212,
    );
    ctx.restore();

    return new AttachmentBuilder(await canvas.encode("png"), {
      name: "level-up.png",
    });
  } catch (err) {
    console.error("[LevelBanners] generateLevelUpBanner:", err);
    return null;
  }
}
