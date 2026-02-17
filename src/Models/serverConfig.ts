import { Schema, model, Document } from "mongoose";

// --- INTERFACES DE SOPORTE ---

interface ICulture {
  vocabulary: Map<string, number>;
  slangs: Array<{ word: string; meaning: string; addedBy: string }>;
  internalJokes: Array<{ trigger: string; response: string; context: string }>;
  emojis: Map<string, number>;
  visualLibrary: Array<{ url: string; context: string; type: string }>;
}

interface ILevelRole {
  level: number;
  roleId: string;
}

interface ISocialMap {
  targets: Array<{ userId: string; tag: string; reason: string }>;
  trustLevels: Map<string, number>;
}

interface IAutoModRule {
  threshold: number;
  action: "WARN" | "MUTE" | "KICK" | "BAN";
  duration: number;
}

interface ISecurityModules {
  antiSpam: boolean;
  antiLinks: boolean;
  antiRaid: boolean;
  antiNuke: boolean;
  antiAlt: boolean;
}

interface IFeedConfig {
  channelId: string;
  title: string;
  color: string;
  emoji: string;
  counter: number;
}

// --- INTERFAZ PRINCIPAL ---

export interface IServerConfig extends Document {
  guildId: string;
  prefix: string;

  // 👇 SISTEMA DE ROLES AUTOMÁTICOS
  autoJoin: {
    enabled: boolean;
    roles: string[];
  };

  // 👇 SISTEMA DE CONFESIONES & FEEDS
  confessions: {
    enabled: boolean;
    channelId: string | null;
    logsChannelId: string | null;
    counter: number;
    allowImages: boolean;
    customTitle: string;
    customColor: string;
    blacklist: string[];
    feeds: IFeedConfig[];
  };

  // 👇 SISTEMA DE NIVELES
  leveling: {
    enabled: boolean;
    xpRate: number;
    ignoredChannels: string[];
    ignoredRoles: string[];
    levelRoles: ILevelRole[];
    announceChannel: string | null;
    announceMessage: string;
  };

  // 👇 CANALES Y CONFIGURACIÓN GENERAL
  memeChannelId: string;
  modLogChannel?: string;

  // 🛡️ SEGURIDAD
  honeypotChannel?: string;
  allowedLinks?: string[];
  pointsPerStrike: number;

  // 👇 SOPORTE PARA MODCONFIG (STRIKES)
  strikeMuteThreshold?: number | null;
  strikeBanThreshold?: number | null;
  strikeMuteDurationMs?: number | null;

  // 👇 IA
  aiMode: "calmado" | "libre";
  aiSafety: "relaxed" | "standard" | "strict" | "high";
  premiumUntil: Date | null;

  aiSystem: {
    mode:
      | "neko"
      | "maid"
      | "gymbro"
      | "yandere"
      | "assistant"
      | "custom"
      | "tsundere"
      | "borracha";
    customPersona: string;
    behavior: "normal" | "pesado" | "agresivo";
    randomChance: number;
    cooldownUntil: Date;
    spontaneousChannels: string[];
  };

  securityModules: ISecurityModules;
  autoModRules: IAutoModRule[];
  infractionsMap: Map<string, number>;

  culture: ICulture;
  socialMap: ISocialMap;
  shortTermMemory: Array<{
    content: string;
    timestamp: Date;
    participants: string[];
  }>;
}

// --- SCHEMA MONGOOSE ---

const serverConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true },

  // 👇 CAMBIO IMPORTANTE: AHORA ES 'x' POR DEFECTO
  prefix: { type: String, default: "x" },

  autoJoin: {
    enabled: { type: Boolean, default: false },
    roles: { type: [String], default: [] },
  },

  confessions: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    logsChannelId: { type: String, default: null },
    counter: { type: Number, default: 0 },
    allowImages: { type: Boolean, default: true },
    customTitle: { type: String, default: "Confesión Anónima" },
    customColor: { type: String, default: "#FFB6C1" },
    blacklist: { type: [String], default: [] },
    feeds: [
      {
        channelId: String,
        title: String,
        color: String,
        emoji: String,
        counter: { type: Number, default: 0 },
      },
    ],
  },

  leveling: {
    enabled: { type: Boolean, default: true },
    xpRate: { type: Number, default: 1 },
    ignoredChannels: { type: [String], default: [] },
    ignoredRoles: { type: [String], default: [] },
    levelRoles: { type: [{ level: Number, roleId: String }], default: [] },
    announceChannel: { type: String, default: null },
    announceMessage: {
      type: String,
      default: "¡Felicidades {user}, has subido al nivel {level}!",
    },
  },

  memeChannelId: { type: String, default: "" },
  modLogChannel: { type: String, default: null },

  // SEGURIDAD
  honeypotChannel: { type: String, default: null },
  allowedLinks: { type: [String], default: [] },
  pointsPerStrike: { type: Number, default: 10 },

  strikeMuteThreshold: { type: Number, default: null },
  strikeBanThreshold: { type: Number, default: null },
  strikeMuteDurationMs: { type: Number, default: null },

  aiMode: { type: String, enum: ["calmado", "libre"], default: "calmado" },
  aiSafety: {
    type: String,
    enum: ["relaxed", "standard", "strict", "high"],
    default: "relaxed",
  },
  premiumUntil: { type: Date, default: null },

  aiSystem: {
    mode: {
      type: String,
      enum: [
        "neko",
        "maid",
        "gymbro",
        "yandere",
        "assistant",
        "custom",
        "tsundere",
        "borracha",
      ],
      default: "neko",
    },
    customPersona: { type: String, default: "" },
    behavior: {
      type: String,
      enum: ["normal", "pesado", "agresivo"],
      default: "normal",
    },
    randomChance: { type: Number, default: 3 },
    cooldownUntil: { type: Date, default: Date.now },
    spontaneousChannels: { type: [String], default: [] },
  },

  securityModules: {
    antiSpam: { type: Boolean, default: false },
    antiLinks: { type: Boolean, default: false },
    antiRaid: { type: Boolean, default: false },
    antiNuke: { type: Boolean, default: false },
    antiAlt: { type: Boolean, default: false },
  },

  autoModRules: {
    type: [
      {
        threshold: { type: Number, required: true },
        action: {
          type: String,
          enum: ["WARN", "MUTE", "KICK", "BAN"],
          required: true,
        },
        duration: { type: Number, default: 0 },
      },
    ],
    default: [],
  },

  infractionsMap: { type: Map, of: Number, default: new Map() },

  culture: {
    vocabulary: { type: Map, of: Number, default: new Map() },
    slangs: [{ word: String, meaning: String, addedBy: String }],
    internalJokes: [{ trigger: String, response: String, context: String }],
    emojis: { type: Map, of: Number, default: new Map() },
    visualLibrary: [
      {
        url: String,
        context: String,
        type: { type: String, enum: ["gif", "image"] },
      },
    ],
  },

  socialMap: {
    targets: [{ userId: String, tag: String, reason: String }],
    trustLevels: { type: Map, of: Number, default: new Map() },
  },

  shortTermMemory: [
    {
      content: String,
      timestamp: { type: Date, default: Date.now },
      participants: [String],
    },
  ],
});

export default model<IServerConfig>("ServerConfig", serverConfigSchema);
