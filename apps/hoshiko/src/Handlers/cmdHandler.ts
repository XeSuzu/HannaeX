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
    client.commands.set(command.name, command);
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

      if (typeof (command as any).prefixRun === "function") {
        client.commands.set(name, {
          name,
          execute: (message: any, args: any[], client: any) =>
            (command as any).prefixRun(client, message, args),
        } as any);
      }
    }
  }

  console.log("Slash commands validated and loaded: " + client.slashCommands.size);
};
