import { Events } from "discord.js";
import { EventFile } from "../../Handlers/eventHandler";
import { handleAutocomplete } from "./handlers/autocomplete";
import { handleCommands } from "./handlers/command";
import { handleComponents } from "./handlers/components";
import { handleModals } from "./handlers/modals";

const event: EventFile<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction, client): Promise<void> {
    // 1. Autocompletado
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
      return;
    }

    // 2. Slash Commands & Context Menus
    if (
      interaction.isChatInputCommand() ||
      interaction.isContextMenuCommand()
    ) {
      await handleCommands(interaction, client);
      return;
    }

    // 3. Modales y Botones de la racha (El handler de Racha captura ModalSubmits también)
    if (
      (interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()) &&
      interaction.customId.startsWith("racha_")
    ) {
      await handleComponents(interaction as any, client);
      return;
    }

    // 4. Componentes generales (Botones, Menús desplegables)
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await handleComponents(interaction, client);
      return;
    }

    // 5. Modales (Reportes, Confesiones, Sugerencias)
    if (interaction.isModalSubmit()) {
      await handleModals(interaction, client);
      return;
    }
  },
};

export default event;
