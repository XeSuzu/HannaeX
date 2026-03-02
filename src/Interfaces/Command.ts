import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  PermissionResolvable,
  Message, // ✅ AÑADIDO
  AutocompleteInteraction // ✅ AÑADIDO (Por si algún día usas autocompletado)
} from 'discord.js';
import { HoshikoClient } from '../index';

export type SlashData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
  | any; // Escudo protector para tipos complejos

export interface CommandOptions {
  ephemeral?: boolean;
  adminOnly?: boolean;
  cooldown?: number; // ✅ Tu nueva estructura limpia
  guildOnly?: boolean;
  permissions?: PermissionResolvable[];
}

export interface SlashCommand {
  category?: string;
  data: SlashData;
  options?: CommandOptions;
  selfManaged?: boolean;
  cooldown?: number; 
  ephemeral?: boolean;
  
  // 🔥 TRUCO 2: Permitimos retornar 'any'. 
  // Así si haces "return interaction.editReply()", TypeScript no se enoja.
  execute: (
    interaction: ChatInputCommandInteraction, 
    client: HoshikoClient
  ) => Promise<any> | any;
  
  autocomplete?: (
    interaction: AutocompleteInteraction, 
    client: HoshikoClient
  ) => Promise<any> | any;
  
  prefixRun?: (
    client: HoshikoClient, 
    message: Message, 
    args: string[]
  ) => Promise<any> | any;
}

export interface PrefixCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  
  execute?: (
    message: Message, 
    args: string[], 
    client: HoshikoClient
  ) => Promise<any> | any;
  
  prefixRun?: (
    client: HoshikoClient, 
    message: Message, 
    args: string[]
  ) => Promise<any> | any;
}