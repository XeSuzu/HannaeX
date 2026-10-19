import {
  Client,
  Collection,
  GatewayIntentBits,
  Options,
  Partials,
} from "discord.js";
import { PrefixCommand, SlashCommand } from "../Interfaces/Command";

/** Discord client with Hoshiko's command collections and environment config. */
export class HoshikoClient extends Client<true> {
  public commands = new Collection<string, PrefixCommand>();
  public slashCommands = new Collection<string, SlashCommand>();
  public cooldowns = new Collection<string, Collection<string, number>>();

  public config = {
    token: process.env.TOKEN || "",
    BotId: process.env.BOT_ID || "",
    prefix: process.env.PREFIX || "!",
    guildIds: process.env.GUILD_ID
      ? process.env.GUILD_ID.split(",").map((id) => id.trim())
      : [],
  };
}

export function createHoshikoClient(): HoshikoClient {
  const BOT_ID = process.env.BOT_ID || "";

  return new HoshikoClient({
    makeCache: Options.cacheWithLimits({
      MessageManager: 50,
      PresenceManager: 1000,
      UserManager: {
        maxSize: 1000,
        keepOverLimit: (user) => user.id === BOT_ID,
      },
      GuildMemberManager: {
        maxSize: 1000,
        keepOverLimit: (member) => member.id === BOT_ID,
      },
    }),
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });
}
