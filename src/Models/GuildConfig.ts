import { Schema, model, Document } from "mongoose";

interface IGuildConfig extends Document {
  guildId: string;
  prefix: string;
  /** @deprecated — usar ServerConfig.logChannels.modlog en su lugar */
  modLogChannel?: string;
  whitelistedUsers: string[];
  securityModules: {
    antiRaid: boolean;
    antiNuke: boolean;
    antiAlt: boolean;
    antiLinks: boolean;
    antiSpam: boolean;
    honeypotChannel?: string;
    aiModeration: boolean;
  };
  allowedLinks: string[];
  globalBlacklistEnabled: boolean;
  language: "es" | "en";
}

const guildConfigSchema = new Schema<IGuildConfig>({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "!" },
  // @deprecated — se mantiene solo para compatibilidad, no usar en código nuevo
  modLogChannel: { type: String, default: null },
  whitelistedUsers: { type: [String], default: [] },
  securityModules: {
    antiRaid:        { type: Boolean, default: false },
    antiNuke:        { type: Boolean, default: false },
    antiAlt:         { type: Boolean, default: false },
    antiLinks:       { type: Boolean, default: false },
    antiSpam:        { type: Boolean, default: false },
    honeypotChannel: { type: String, default: null },
    aiModeration:    { type: Boolean, default: false },
  },
  allowedLinks:            { type: [String], default: [] },
  globalBlacklistEnabled:  { type: Boolean, default: true },
  language:                { type: String, enum: ["es", "en"], default: "es" },
});

export default model<IGuildConfig>("GuildConfig", guildConfigSchema);