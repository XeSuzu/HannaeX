import { AutocompleteInteraction } from "discord.js";
import { HoshikoClient } from "../../../index";

export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  client: HoshikoClient,
) {
  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd || !("autocomplete" in cmd)) return;
  try {
    await (cmd as any).autocomplete(interaction, client);
  } catch (error) {
    console.error(
      `⚠️ Error en autocompletado:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
