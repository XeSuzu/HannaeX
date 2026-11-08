import path from "path";
import type { HoshikoClient } from "../client/HoshikoClient";
import type { PrefixCommand, SlashCommand } from "../Interfaces/Command";
import { loadCommands } from "./commandLoader";

export default (client: HoshikoClient): void => {
  const prefixPath = path.join(__dirname, "../Commands/PrefixCmds");

  const prefixCommands = loadCommands<PrefixCommand>(prefixPath, (cmd) => {
    return (
      cmd && typeof cmd.name === "string" && typeof cmd.execute === "function"
    );
  });

  for (const command of prefixCommands) {
    const key = command.name.toLowerCase();
    client.commands.set(key, command);
    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        if (alias && typeof alias === "string") {
          client.commands.set(alias.toLowerCase(), command);
        }
      }
    }
  }
  console.log("Prefix commands validated and loaded: " + client.commands.size);

  const slashPath = path.join(__dirname, "../Commands/SlashCmds");

  const slashCommands = loadCommands<SlashCommand>(slashPath, (cmd) => {
    return cmd && cmd.data && typeof cmd.execute === "function";
  });

  for (const command of slashCommands) {
    const name = command.data.name;

    if (name) {
      client.slashCommands.set(name, command);

      if (typeof command.prefixRun === "function") {
        const key = name.toLowerCase();
        const wrappedCommand: PrefixCommand = {
          name: key,
          description: command.data.description || "",
          aliases: command.aliases,
          execute: (message: any, args: any[], c: any) =>
            command.prefixRun!(c, message, args),
          prefixRun: (c: any, message: any, args: any[]) =>
            command.prefixRun!(c, message, args),
        };
        if (!client.commands.has(key)) {
          client.commands.set(key, wrappedCommand);
        }
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            const aliasKey = alias?.toLowerCase();
            if (aliasKey && !client.commands.has(aliasKey)) {
              client.commands.set(aliasKey, wrappedCommand);
            }
          }
        }
      }
    }
  }

  console.log("Slash commands validated and loaded: " + client.slashCommands.size);
};
