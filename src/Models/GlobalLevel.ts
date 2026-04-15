import { Document, Schema, model } from "mongoose";

// ============================================
// SISTEMA DE NIVELES GLOBAL - TIER LIST
// ============================================
// Tiers kawaii en japonés con temática sakura/naturaleza

export interface IGlobalLevel extends Document {
  userId: string;

  // XP Global
  globalXp: number;
  globalLevel: number;

  // Estadísticas globales
  totalMessages: number;
  totalVoiceMinutes: number;
  serversJoined: number;

  // Logros/Títulos desbloqueados
  achievements: string[];

  // Tier actual (basado en globalLevel)
  currentTier: string;

  // Racha global
  globalStreak: number;
  lastGlobalXpGain: Date;

  // Meta-semanal
  weeklyXp: number;
  weeklyMessages: number;
  weekStartDate: Date;

  // Abuso
  abuseCooldownUntil?: Date;
  lastAbuseWarning?: Date;

  // Actualizado por última vez
  updatedAt: Date;
}

// Sistema de Tiers Globales en JAPONÉS KAWAI
// Todos los nombres son en japonés con temática de sakura/naturaleza/milky way
export const GLOBAL_TIERS = [
  {
    name: "識別",
    nameJp: "みほん",
    tier: "mihon",
    minLevel: 0,
    color: 0xffb7c5,
    emoji: "🌱",
    description: "Tu viaje apenas comienza, pequeño brote~",
  },
  {
    name: "芽生え",
    nameJp: "めだま",
    tier: "medama",
    minLevel: 5,
    color: 0x98fb98,
    emoji: "🌿",
    description: "Una pequeña semilla que empieza a crecer!",
  },
  {
    name: "葉桜",
    nameJp: "は桜",
    tier: "hazakura",
    minLevel: 10,
    color: 0xff69b4,
    emoji: "🍃",
    description: "Las hojas del sakura empiezan a aparecer~",
  },
  {
    name: "花びら",
    nameJp: "はなびら",
    tier: "hanabira",
    minLevel: 20,
    color: 0xff1493,
    emoji: "🌸",
    description: "Los pétalos de sakura comienzan a florecer!",
  },
  {
    name: "満開",
    nameJp: "まんかい",
    tier: "mankai",
    minLevel: 35,
    color: 0xff6b81,
    emoji: "🌺",
    description: "El sakura en su máximo esplendor! ✨",
  },
  {
    name: "春風",
    nameJp: "はるかぜ",
    tier: "harukaze",
    minLevel: 50,
    color: 0x87ceeb,
    emoji: "🌸",
    description: "Una brisa suave de primavera~",
  },
  {
    name: "流水",
    nameJp: "りゅうすい",
    tier: "ryuusui",
    minLevel: 75,
    color: 0x00ced1,
    emoji: "💧",
    description: "Como el agua que fluye suavemente",
  },
  {
    name: "月夜",
    nameJp: "つきよ",
    tier: "tsukiyo",
    minLevel: 100,
    color: 0x4b0082,
    emoji: "🌙",
    description: "La luna brilla en la noche más oscura~",
  },
  {
    name: "星空",
    nameJp: "ほしぞら",
    tier: "hoshibora",
    minLevel: 150,
    color: 0x000080,
    emoji: "⭐",
    description: "Un cielo lleno de estrellas brillantes!",
  },
  {
    name: "銀河",
    nameJp: "ぎんが",
    tier: "ginga",
    minLevel: 200,
    color: 0x9400d3,
    emoji: "🌌",
    description: "La galaxia entera gira a tu alrededor~",
  },
  {
    name: "宇宙",
    nameJp: "うちゅう",
    tier: "uchuu",
    minLevel: 300,
    color: 0x000000,
    emoji: "✨",
    description: "Has transcendido los límites del universo!",
  },
  {
    name: "神桜",
    nameJp: "かみざく",
    tier: "kamizakura",
    minLevel: 500,
    color: 0xffd700,
    emoji: "🌸✨",
    description: "El sakura divino, máxima expresión~ 💫",
  },
];

// Logros Kawaii
export const ACHIEVEMENTS = [
  {
    id: "first_level",
    name: "はじめまして",
    nameEn: "First Steps",
    emoji: "👶",
    description: "Dio su primer paso en el mundo de Hoshiko~",
    color: 0xffb7c5,
  },
  {
    id: "level_10",
    name: "十の道",
    nameEn: "Level 10",
    emoji: "🔟",
    description: "Ha caminado 10 pasos en el camino sakura!",
    color: 0xff69b4,
  },
  {
    id: "level_50",
    name: "五十鳴き",
    nameEn: "Level 50",
    emoji: "🎊",
    description: "半个道の終わり! Medio camino completado~",
    color: 0xff6b81,
  },
  {
    id: "level_100",
    name: "百華",
    nameEn: "Level 100",
    emoji: "💯",
    description: "Centuria alcanzada! Eres una leyenda~",
    color: 0xffd700,
  },
  {
    id: "messages_1k",
    name: "千鳥",
    nameEn: "1K Messages",
    emoji: "💬",
    description: "Ha enviado 1000 mensajes! Muy activo~",
    color: 0x00ced1,
  },
  {
    id: "messages_10k",
    name: "万葉",
    nameEn: "10K Messages",
    emoji: "💭",
    description: "10000 mensajes! La comunidad te adora~",
    color: 0x9400d3,
  },
  {
    id: "streak_7",
    name: "一週間",
    nameEn: "7 Day Streak",
    emoji: "🔥",
    description: "7 días consecutivos! Imparable~",
    color: 0xff4500,
  },
  {
    id: "streak_30",
    name: "月間",
    nameEn: "30 Day Streak",
    emoji: "🔥",
    description: "30 días seguidos! Dedicación máxima!",
    color: 0xff0000,
  },
  {
    id: "multi_server",
    name: "複数サーバー",
    nameEn: "Multi-Server",
    emoji: "🌐",
    description: "Activo en múltiples servidores!",
    color: 0x4169e1,
  },
  {
    id: "early_bird",
    name: "早起き",
    nameEn: "Early Bird",
    emoji: "🐦",
    description: "Un ave madrugadora~",
    color: 0xffa500,
  },
  {
    id: "voice_1h",
    name: "一時間",
    nameEn: "1 Hour Voice",
    emoji: "🎤",
    description: "60 minutos en voz! Buena conversación~",
    color: 0x87ceeb,
  },
  {
    id: "voice_10h",
    name: "十時間",
    nameEn: "10 Hours Voice",
    emoji: "🎙️",
    description: "600 minutos en voz! Muy sociable~",
    color: 0x00ced1,
  },
  {
    id: "voice_100h",
    name: "百時間",
    nameEn: "100 Hours Voice",
    emoji: "🎧",
    description: "6000 minutos en voz! Leyenda del chat de voz!",
    color: 0x4b0082,
  },
];

export function getTierForLevel(level: number): (typeof GLOBAL_TIERS)[0] {
  let currentTier = GLOBAL_TIERS[0];
  for (const tier of GLOBAL_TIERS) {
    if (level >= tier.minLevel) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

export function getAchievement(
  id: string,
): (typeof ACHIEVEMENTS)[0] | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// XP necesaria para subir del nivel N al N+1
export function globalXpForLevel(level: number): number {
  return Math.floor(150 + level * 75);
}

// XP total acumulada hasta el nivel N
export function globalTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += globalXpForLevel(i);
  return total;
}

const globalLevelSchema = new Schema<IGlobalLevel>({
  userId: { type: String, required: true, unique: true },
  globalXp: { type: Number, default: 0 },
  globalLevel: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  totalVoiceMinutes: { type: Number, default: 0 },
  serversJoined: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
  currentTier: { type: String, default: "mihon" },
  globalStreak: { type: Number, default: 0 },
  lastGlobalXpGain: { type: Date, default: Date.now },
  weeklyXp: { type: Number, default: 0 },
  weeklyMessages: { type: Number, default: 0 },
  weekStartDate: {
    type: Date,
    default: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - now.getDay());
      return now;
    },
  },
  abuseCooldownUntil: { type: Date },
  lastAbuseWarning: { type: Date },
  updatedAt: { type: Date, default: Date.now },
});

globalLevelSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

globalLevelSchema.pre("save", function (next) {
  const tier = getTierForLevel(this.globalLevel);
  this.currentTier = tier.tier;
  next();
});

export default model<IGlobalLevel>("GlobalLevel", globalLevelSchema);
