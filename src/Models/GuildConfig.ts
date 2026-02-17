import { Schema, model, Document } from "mongoose";

interface IAutoAction {
  points: number;
  action: "timeout" | "kick" | "ban";
  duration?: number;
}

const autoActionSchema = new Schema<IAutoAction>({
  points: { type: Number, required: true },
  action: { type: String, enum: ["timeout", "kick", "ban"], required: true },
  duration: { type: Number, required: false },
});

interface IGuildConfig extends Document {
  guildId: string;
  prefix: string;
  modLogChannel?: string;
  pointsPerStrike: number;
  autoActions: IAutoAction[];
  securityModules: {
    antiRaid: boolean;
    antiNuke: boolean;
    antiAlt: boolean; // ✨ Añadido
    antiLinks: boolean; // ✨ Añadido
    honeypotChannel?: string;
    aiModeration: boolean;
  };
  allowedLinks: string[]; // ✨ Añadido para la whitelist
  globalBlacklistEnabled: boolean;
  language: "es" | "en";
}

const guildConfigSchema = new Schema<IGuildConfig>({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "!" },
  modLogChannel: { type: String, default: null },
  pointsPerStrike: { type: Number, default: 10 },
  autoActions: { type: [autoActionSchema], default: [] },

  securityModules: {
    antiRaid: { type: Boolean, default: false },
    antiNuke: { type: Boolean, default: false },
    antiAlt: { type: Boolean, default: false }, // ✨ Inicializado
    antiLinks: { type: Boolean, default: false }, // ✨ Inicializado
    honeypotChannel: { type: String, default: null },
    aiModeration: { type: Boolean, default: false },
  },

  allowedLinks: { type: [String], default: [] }, // ✨ Inicializado
  globalBlacklistEnabled: { type: Boolean, default: true },
  language: { type: String, enum: ["es", "en"], default: "es" },
});

export default model<IGuildConfig>("GuildConfig", guildConfigSchema);
