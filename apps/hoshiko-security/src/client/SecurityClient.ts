import { Client, GatewayIntentBits, Partials } from "discord.js";
import { SecurityConfig } from "../config/SecurityConfig";

export class SecurityClient extends Client {
  public readonly config = SecurityConfig;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User,
      ],
    });
  }
}

export function createSecurityClient(): SecurityClient {
  return new SecurityClient();
}
