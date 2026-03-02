import { Schema, model, Document } from "mongoose";

interface ILevelRole {
  level: number;
  roleId: string;
}

interface ISocialMap {
  targets: Array<{ userId: string; tag: string; reason: string }>;
  trustLevels: Map<string, number>;
}

interface ISecurityModules {
  antiSpam: boolean;
  antiLinks: boolean;
  antiRaid: boolean;
  antiNuke: boolean;
  antiAlt: boolean;
  snipe?: boolean;
}

interface IFeedConfig {
  channelId: string;
  title: string;
  color: string;
  emoji: string;
  counter: number;
}

interface ICulture {
  vocabulary: Map<string, number>;
  slangs: Array<{ word: string; meaning: string; addedBy: string }>;
  internalJokes: Array<{ trigger: string; response: string; context: string }>;
  emojis: Map<string, number>;
  visualLibrary: Array<{ url: string; context: string; type: string }>;
}

export interface ILogChannels {
  modlog: string | null;       // Ban, kick, mute, warn (manual + automod)
  serverlog: string | null;    // Entradas/salidas, cambios de roles y canales
  confesslog: string | null;   // Confesiones reportadas (sensible)
  joinlog: string | null;      // Entradas de miembros + detección de alts
  messagelog: string | null;   // Mensajes editados/eliminados [PREMIUM]
  voicelog: string | null;     // Actividad de canales de voz [PREMIUM]
  boostlog: string | null;     // Boosts del servidor [PREMIUM]
  levellog: string | null;     // Subidas de nivel [PREMIUM]
}

export interface IServerConfig extends Document {
  guildId: string;
  prefix: string;

  autoJoin: {
    enabled: boolean;
    roles: string[];
  };

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

  leveling: {
    enabled: boolean;
    xpRate: number;
    ignoredChannels: string[];
    ignoredRoles: string[];
    levelRoles: ILevelRole[];
    announceChannel: string | null;
    announceMessage: string;
  };

  memeChannelId: string;

  // @deprecated — usar logChannels.modlog en su lugar
  modLogChannel?: string;

  honeypotChannel?: string;
  allowedLinks?: string[];

  // ✅ Sistema de logs centralizado
  logChannels: ILogChannels;

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

  culture: ICulture;
  socialMap: ISocialMap;
  shortTermMemory: Array<{
    content: string;
    timestamp: Date;
    participants: string[];
  }>;
}

const serverConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true },
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

  // @deprecated — se mantiene para migración automática
  modLogChannel: { type: String, default: null },

  honeypotChannel: { type: String, default: null },
  allowedLinks: { type: [String], default: [] },

  // ✅ Sistema de logs centralizado
  logChannels: {
    modlog:     { type: String, default: null },
    serverlog:  { type: String, default: null },
    confesslog: { type: String, default: null },
    joinlog:    { type: String, default: null },
    messagelog: { type: String, default: null },
    voicelog:   { type: String, default: null },
    boostlog:   { type: String, default: null },
    levellog:   { type: String, default: null },
  },

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
        "neko", "maid", "gymbro", "yandere",
        "assistant", "custom", "tsundere", "borracha",
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
    snipe: { type: Boolean, default: false },
  },

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

// ✅ MIGRACIÓN AUTOMÁTICA: Si el servidor tenía modLogChannel configurado
// y todavía no tiene logChannels.modlog, lo copiamos automáticamente
serverConfigSchema.post("find", function (docs: IServerConfig[]) {
  for (const doc of docs) {
    if (doc.modLogChannel && !doc.logChannels?.modlog) {
      doc.logChannels = doc.logChannels || {} as ILogChannels;
      doc.logChannels.modlog = doc.modLogChannel;
    }
  }
});

serverConfigSchema.post("findOne", function (doc: IServerConfig | null) {
  if (!doc) return;
  if (doc.modLogChannel && !doc.logChannels?.modlog) {
    doc.logChannels = doc.logChannels || {} as ILogChannels;
    doc.logChannels.modlog = doc.modLogChannel;
  }
});

export default model<IServerConfig>("ServerConfig", serverConfigSchema);