// ============================================
// GENERADOR DE BANNERS KAWII CON @napi-rs/canvas
// ============================================
// Usa @napi-rs/canvas para mejor rendimiento
// npm install @napi-rs/canvas

import { AttachmentBuilder } from "discord.js";
import {
  getAchievement,
  getTierForLevel,
  GLOBAL_TIERS,
  IGlobalLevel,
} from "../Models/GlobalLevel";

// Intentar importar canvas, si falla usar fallback
let Canvas: any = null;
let Image: any = null;

try {
  // @ts-ignore
  const canvas = require("@napi-rs/canvas");
  Canvas = canvas.Canvas;
  Image = canvas.Image;
} catch (e) {
  console.log(
    "[LevelBanners] @napi-rs/canvas no instalado, usando fallback de embeds",
  );
}

// ============================================
// CONFIGURACIÓN
// ============================================
const BANNER_CONFIG = {
  width: 800,
  height: 400,
  fontDir: "./src/assets/fonts/",
};

// Colores sakura
const COLORS = {
  sakuraPink: "#FFB7C5",
  sakuraDark: "#FF69B4",
  sakuraLight: "#FFF0F5",
  gold: "#FFD700",
  white: "#FFFFFF",
  black: "#000000",
  gray: "#808080",
};

// ============================================
// FUNCIONES DE DIBUJO (napi-rs/canvas)
// ============================================

async function createCanvas(width: number, height: number): Promise<any> {
  if (!Canvas) return null;
  return new Canvas(width, height);
}

async function loadImage(url: string): Promise<any> {
  if (!Image) return null;
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ============================================
// GENERADORES DE BANNERS
// ============================================

/**
 * Genera banner de logro desbloqueado
 */
export async function generateAchievementBanner(
  achievementId: string,
  user: any,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!Canvas) return null;

  const achievement = getAchievement(achievementId);
  if (!achievement) return null;

  const canvas = await createCanvas(600, 300);
  const ctx = canvas.getContext("2d");

  // Fondo con gradiente sakura
  const gradient = ctx.createLinearGradient(0, 0, 600, 300);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, COLORS.sakuraPink);
  gradient.addColorStop(1, COLORS.sakuraDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 300);

  // Marco decorativo
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 280);

  // Avatar circular
  if (avatarBuffer) {
    const img = new Image();
    img.src = avatarBuffer;
    ctx.save();
    ctx.beginPath();
    ctx.arc(300, 100, 60, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 240, 40, 120, 120);
    ctx.restore();
  }

  // Texto del logro
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(achievement.emoji, 300, 200);

  ctx.font = "bold 28px sans-serif";
  ctx.fillText(achievement.name, 300, 245);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = COLORS.white;
  ctx.fillText(achievement.description, 300, 280);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "achievement.png" });
}

/**
 * Genera banner de subida de nivel global
 */
export async function generateLevelUpBanner(
  user: any,
  oldLevel: number,
  newLevel: number,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!Canvas) return null;

  const tier = getTierForLevel(newLevel);
  const canvas = await createCanvas(800, 400);
  const ctx = canvas.getContext("2d");

  // Fondo gradiente basado en tier
  const gradient = ctx.createLinearGradient(0, 0, 800, 400);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, `#${tier.color.toString(16).padStart(6, "0")}`);
  gradient.addColorStop(1, COLORS.sakuraPink);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 400);

  // Decoración sakura (pétalos)
  drawSakuraPetalsSync(ctx, 800, 400);

  // Avatar
  if (avatarBuffer) {
    const img = new Image();
    img.src = avatarBuffer;
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 130, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 330, 60, 140, 140);
    ctx.restore();
  }

  // Badge de nivel
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

  // Texto
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`LEVEL ${newLevel}`, 400, 340);

  ctx.font = "20px sans-serif";
  ctx.fillText(tier.name, 400, 375);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "levelup.png" });
}

/**
 * Genera banner de nuevo tier
 */
export async function generateTierUpBanner(
  user: any,
  tier: (typeof GLOBAL_TIERS)[0],
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!Canvas) return null;

  const canvas = await createCanvas(800, 500);
  const ctx = canvas.getContext("2d");

  // Fondo
  const colorHex = `#${tier.color.toString(16).padStart(6, "0")}`;
  const gradient = ctx.createLinearGradient(0, 0, 800, 500);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(0.5, COLORS.sakuraPink);
  gradient.addColorStop(1, colorHex);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 500);

  // Confeti
  drawConfettiSync(ctx, 800, 500);

  // Título
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✨ NEW TIER ✨", 400, 80);

  // Tier badge grande
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(400, 200, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.font = "bold 80px sans-serif";
  ctx.fillText(tier.emoji, 400, 230);

  // Nombre del tier
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 48px sans-serif";
  ctx.fillText(tier.name, 400, 350);

  ctx.font = "28px sans-serif";
  ctx.fillText(tier.nameJp, 400, 390);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(tier.description, 400, 430);

  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = COLORS.white;
  ctx.fillText("TIER UNLOCKED!", 400, 480);

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "tierup.png" });
}

/**
 * Genera banner de perfil global
 */
export async function generateGlobalRankBanner(
  user: any,
  profile: IGlobalLevel,
  rank: number,
  totalUsers: number,
  avatarBuffer?: Buffer,
): Promise<AttachmentBuilder | null> {
  if (!Canvas) return null;

  const tier = getTierForLevel(profile.globalLevel);
  const canvas = await createCanvas(900, 500);
  const ctx = canvas.getContext("2d");

  // Fondo
  const colorHex = `#${tier.color.toString(16).padStart(6, "0")}`;
  const gradient = ctx.createLinearGradient(0, 0, 900, 500);
  gradient.addColorStop(0, COLORS.sakuraLight);
  gradient.addColorStop(0.5, colorHex);
  gradient.addColorStop(1, COLORS.sakuraLight);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 500);

  // Marco
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 6;
  ctx.strokeRect(15, 15, 870, 470);

  // Avatar
  if (avatarBuffer) {
    const img = new Image();
    img.src = avatarBuffer;
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 200, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 70, 120, 160, 160);
    ctx.restore();
  }

  // Nombre
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(user.displayName, 280, 150);

  // Nivel
  ctx.font = "bold 72px sans-serif";
  ctx.fillText(`LV.${profile.globalLevel}`, 280, 240);

  // XP
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`${profile.globalXp.toLocaleString()} XP Global`, 280, 280);

  // Rank
  ctx.fillStyle = COLORS.gold;
  ctx.font = "bold 48px sans-serif";
  ctx.fillText(`#${rank}`, 280, 360);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`of ${totalUsers.toLocaleString()} users`, 280, 390);

  // Tier badge
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

  // Logros
  ctx.textAlign = "left";
  const achievementsList = profile.achievements.slice(0, 6);
  achievementsList.forEach((achId: string, i: number) => {
    const ach = getAchievement(achId);
    if (ach) {
      ctx.font = "32px sans-serif";
      ctx.fillText(ach.emoji, 100 + i * 50, 420);
    }
  });

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: "globalrank.png" });
}

// ============================================
// FUNCIONES DE DIBUJO SYNC (para usar en canvas)
// ============================================

function drawSakuraPetalsSync(ctx: any, width: number, height: number): void {
  // Pétalos de sakura distribuidos
  const petals = [
    { x: 50, y: 50 },
    { x: 700, y: 80 },
    { x: 100, y: 350 },
    { x: 650, y: 320 },
    { x: 200, y: 100 },
    { x: 550, y: 150 },
  ];

  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  petals.forEach((p: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 15, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawConfettiSync(ctx: any, width: number, height: number): void {
  const colors = [COLORS.sakuraPink, COLORS.gold, COLORS.white, "#FF69B4"];

  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(x, y, 8, 8);
  }
}

// ============================================
// HELPERS PARA EMBEDS (FALLBACK)
// ============================================

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
    thumbnail: {
      url: user.displayAvatarURL(),
    },
    footer: {
      text: "Hoshiko Global Levels ✨",
    },
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
    thumbnail: {
      url: user.displayAvatarURL(),
    },
    footer: {
      text: "Hoshiko Global Levels ✨",
    },
    timestamp: new Date(),
  };
}

export function getTierUpEmbed(user: any, tier: (typeof GLOBAL_TIERS)[0]): any {
  return {
    color: tier.color,
    title: `${tier.emoji} ¡Nuevo Tier Desbloqueado! ${tier.emoji}`,
    description:
      `**${user.displayName}** ha alcanzado el tier:\n\n` +
      `✨ **${tier.name}** ✨\n` +
      `${tier.nameJp}\n\n` +
      `📝 "${tier.description}"`,
    thumbnail: {
      url: user.displayAvatarURL(),
    },
    footer: {
      text: "Hoshiko Global Levels ✨",
    },
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
    thumbnail: {
      url: user.displayAvatarURL(),
    },
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
    footer: {
      text: "Hoshiko Global Levels ✨",
    },
    timestamp: new Date(),
  };
}
