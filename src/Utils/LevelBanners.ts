// ============================================
// GENERADOR DE BANNERS CON @napi-rs/canvas
// ============================================

import { AttachmentBuilder } from "discord.js";
import path from "path";
import {
  getAchievement,
  getTierForLevel,
  GLOBAL_TIERS,
  IGlobalLevel,
} from "../Models/GlobalLevel";

let canvasLib: any = null;

try {
  canvasLib = require("@napi-rs/canvas");
} catch (e) {
  console.log("[LevelBanners] @napi-rs/canvas no instalado, usando fallback");
}

const BG_PATH = path.join(
  process.cwd(),
  "src/assets/images/banners/level-banners/bg-banner-1.jpg",
);

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/");

const BANNER_CONFIG = { width: 900, height: 300 };

const COLORS = {
  white: "#FFFFFF",
  lavender: "#E8D5FF",
  purple: "#C084FC",
  overlayBg: "rgba(20,10,40,0.55)",
  progressBg: "rgba(255,255,255,0.2)",
  gold: "#FFD700",
  black: "#000000",
  gray: "#808080",
  sakuraPink: "#FFB7C5",
  sakuraDark: "#FF69B4",
  sakuraLight: "#FFF0F5",
};

export interface RankBannerData {
  username: string;
  avatarBuffer: Buffer;
  level: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  rank: number;
}

function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateRankBanner(
  data: RankBannerData,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;

  try {
    const { createCanvas, loadImage, GlobalFonts } = canvasLib;

    try {
      GlobalFonts.registerFromPath(
        path.join(FONT_DIR, "Nunito-Bold.ttf"),
        "Nunito Bold",
      );
      GlobalFonts.registerFromPath(
        path.join(FONT_DIR, "Nunito-Regular.ttf"),
        "Nunito Regular",
      );
    } catch (e) {}

    const { width, height } = BANNER_CONFIG;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fondo
    const bg = await loadImage(BG_PATH);
    ctx.drawImage(bg, 0, 0, width, height);

    // Overlay
    ctx.fillStyle = COLORS.overlayBg;
    ctx.fillRect(0, 0, width, height);

    // Avatar
    const avatarX = 70;
    const avatarY = height / 2;
    const avatarRadius = 65;

    const avatarImg = await loadImage(data.avatarBuffer);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.lavender;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      avatarImg,
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2,
    );
    ctx.restore();

    // Username
    const textX = 165;
    ctx.fillStyle = COLORS.white;
    ctx.font = `bold 34px "Nunito Bold", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(data.username, textX, 90);

    // Nivel
    ctx.fillStyle = COLORS.lavender;
    ctx.font = `26px "Nunito Regular", sans-serif`;
    ctx.fillText(`Nivel ${data.level}`, textX, 130);

    // Barra de progreso
    const barX = textX;
    const barY = 158;
    const barWidth = 560;
    const barHeight = 22;
    const barRadius = 11;

    ctx.fillStyle = COLORS.progressBg;
    roundRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();

    const fillWidth = Math.max(
      barRadius * 2,
      Math.floor((data.progressPercent / 100) * barWidth),
    );
    const gradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    gradient.addColorStop(0, "#A855F7");
    gradient.addColorStop(1, "#E879F9");
    ctx.fillStyle = gradient;
    roundRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
    ctx.fill();

    // XP info
    ctx.fillStyle = COLORS.lavender;
    ctx.font = `18px "Nunito Regular", sans-serif`;
    ctx.fillText(
      `${data.xpCurrent.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP  (${data.progressPercent}%)`,
      barX,
      205,
    );

    // Rank
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold 38px "Nunito Bold", sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(`#${data.rank}`, width - 40, 70);

    ctx.fillStyle = COLORS.lavender;
    ctx.font = `16px "Nunito Regular", sans-serif`;
    ctx.fillText("en el servidor", width - 40, 95);

    const buffer = canvas.toBuffer("image/png");
    return new AttachmentBuilder(buffer, { name: "rank.png" });
  } catch (err) {
    console.error("[LevelBanners] Error generando rank banner:", err);
    return null;
  }
}

export async function generateAchievementBanner(
  achievementId: string,
  user: any,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  const achievement = getAchievement(achievementId);
  if (!achievement) return null;
  const { createCanvas } = canvasLib;
  const canvas = createCanvas(600, 300);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 600, 300);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, COLORS.sakuraPink);
  gradient.addColorStop(1, COLORS.sakuraDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 300);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 280);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(achievement.emoji, 300, 200);
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(achievement.name, 300, 245);
  ctx.font = "18px sans-serif";
  ctx.fillText(achievement.description, 300, 280);
  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "achievement.png" });
}

export async function generateLevelUpBanner(
  user: any,
  oldLevel: number,
  newLevel: number,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  const { createCanvas, loadImage } = canvasLib;
  const tier = getTierForLevel(newLevel);
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 800, 400);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, `#${tier.color.toString(16).padStart(6, "0")}`);
  gradient.addColorStop(1, COLORS.sakuraPink);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 400);
  if (avatarBuffer) {
    const img = await loadImage(avatarBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 130, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 330, 60, 140, 140);
    ctx.restore();
  }
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(400, 250, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = COLORS.black;
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(newLevel.toString(), 400, 265);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`LEVEL ${newLevel}`, 400, 340);
  ctx.font = "20px sans-serif";
  ctx.fillText(tier.name, 400, 375);
  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "levelup.png" });
}

export async function generateTierUpBanner(
  user: any,
  tier: (typeof GLOBAL_TIERS)[0],
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  const { createCanvas } = canvasLib;
  const canvas = createCanvas(800, 500);
  const ctx = canvas.getContext("2d");
  const colorHex = `#${tier.color.toString(16).padStart(6, "0")}`;
  const gradient = ctx.createLinearGradient(0, 0, 800, 500);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(0.5, COLORS.sakuraPink);
  gradient.addColorStop(1, colorHex);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 500);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✨ NEW TIER ✨", 400, 80);
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(400, 200, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.font = "bold 80px sans-serif";
  ctx.fillText(tier.emoji, 400, 230);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 48px sans-serif";
  ctx.fillText(tier.name, 400, 350);
  ctx.font = "28px sans-serif";
  ctx.fillText(tier.nameJp, 400, 390);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(tier.description, 400, 430);
  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "tierup.png" });
}

export async function generateGlobalRankBanner(
  user: any,
  profile: IGlobalLevel,
  rank: number,
  totalUsers: number,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!canvasLib) return null;
  const { createCanvas, loadImage } = canvasLib;
  const tier = getTierForLevel(profile.globalLevel);
  const canvas = createCanvas(900, 500);
  const ctx = canvas.getContext("2d");
  const colorHex = `#${tier.color.toString(16).padStart(6, "0")}`;
  const gradient = ctx.createLinearGradient(0, 0, 900, 500);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, colorHex);
  gradient.addColorStop(1, COLORS.sakuraLight);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 500);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 6;
  ctx.strokeRect(15, 15, 870, 470);
  if (avatarBuffer) {
    const img = await loadImage(avatarBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 200, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 70, 120, 160, 160);
    ctx.restore();
  }
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(user.displayName, 280, 150);
  ctx.font = "bold 72px sans-serif";
  ctx.fillText(`LV.${profile.globalLevel}`, 280, 240);
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`${profile.globalXp.toLocaleString()} XP Global`, 280, 280);
  ctx.fillStyle = COLORS.gold;
  ctx.font = "bold 48px sans-serif";
  ctx.fillText(`#${rank}`, 280, 360);
  ctx.font = "20px sans-serif";
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`of ${totalUsers.toLocaleString()} users`, 280, 390);
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(750, 150, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = "bold 60px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(tier.emoji, 750, 170);
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(tier.name, 750, 230);
  ctx.font = "18px sans-serif";
  ctx.fillText(tier.nameJp, 750, 255);
  const achievementsList = profile.achievements.slice(0, 6);
  achievementsList.forEach((achId: string, i: number) => {
    const ach = getAchievement(achId);
    if (ach) {
      ctx.font = "32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(ach.emoji, 100 + i * 50, 420);
    }
  });
  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "globalrank.png" });
}

export function getAchievementEmbed(achievementId: string, user: any): any {
  const achievement = getAchievement(achievementId);
  if (!achievement) return null;
  return {
    color: achievement.color,
    title: `${achievement.emoji} ¡Logro Desbloqueado! ${achievement.emoji}`,
    description:
      `**${user.displayName}** ha conseguido:\n\n` +
      `🌸 **${achievement.name}** (${achievement.nameEn})\n` +
      `📝 ${achievement.description}`,
    thumbnail: { url: user.displayAvatarURL() },
    footer: { text: "Hoshiko Global Levels ✨" },
    timestamp: new Date(),
  };
}

export function getLevelUpEmbed(
  user: any,
  oldLevel: number,
  newLevel: number,
): any {
  const tier = getTierForLevel(newLevel);
  return {
    color: tier.color,
    title: `${tier.emoji} ¡Nivel Global: ${newLevel}! ${tier.emoji}`,
    description:
      `**${user.displayName}** ha alcanzado el **nivel ${newLevel}**!\n\n` +
      `🏆 Tier actual: **${tier.name}** (${tier.nameJp}) ${tier.emoji}\n` +
      `📝 "${tier.description}"`,
    thumbnail: { url: user.displayAvatarURL() },
    footer: { text: "Hoshiko Global Levels ✨" },
    timestamp: new Date(),
  };
}

export function getTierUpEmbed(user: any, tier: (typeof GLOBAL_TIERS)[0]): any {
  return {
    color: tier.color,
    title: `${tier.emoji} ¡Nuevo Tier Desbloqueado! ${tier.emoji}`,
    description:
      `**${user.displayName}** ha alcanzado el tier:\n\n` +
      `✨ **${tier.name}** ✨\n${tier.nameJp}\n\n` +
      `📝 "${tier.description}"`,
    thumbnail: { url: user.displayAvatarURL() },
    footer: { text: "Hoshiko Global Levels ✨" },
    timestamp: new Date(),
  };
}

export function getGlobalRankEmbed(
  user: any,
  profile: IGlobalLevel,
  rank: number,
  totalUsers: number,
): any {
  const tier = getTierForLevel(profile.globalLevel);
  return {
    color: tier.color,
    author: {
      name: `${tier.emoji} ${user.displayName} — ${tier.name} ${tier.emoji}`,
      icon_url: user.displayAvatarURL(),
    },
    title: `Nivel Global ${profile.globalLevel}`,
    thumbnail: { url: user.displayAvatarURL() },
    fields: [
      {
        name: `${tier.emoji} Tier Actual`,
        value: `**${tier.name}** (${tier.nameJp})\n${tier.description}`,
        inline: true,
      },
      {
        name: "🌐 Ranking Global",
        value: `**#${rank}** de ${totalUsers.toLocaleString()} usuarios`,
        inline: true,
      },
      {
        name: "💬 Mensajes Totales",
        value: `\`${profile.totalMessages.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "⚡ XP Global",
        value: `\`${profile.globalXp.toLocaleString()}\` XP`,
        inline: true,
      },
      {
        name: "🏆 Logros",
        value:
          profile.achievements.length > 0
            ? profile.achievements
                .map((a: string) => getAchievement(a)?.emoji || "🏅")
                .join(" ")
            : "Sin logros aún",
        inline: true,
      },
    ],
    footer: { text: "Hoshiko Global Levels ✨" },
    timestamp: new Date(),
  };
}
