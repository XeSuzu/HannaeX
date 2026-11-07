import { Events } from "discord.js";
import { EventFile } from "../../Handlers/eventHandler";
import { handleAutocomplete } from "./handlers/autocomplete";
import { acquireInteractionLock, handleCommands } from "./handlers/command";
import { handleComponents } from "./handlers/components";
import { handleModals } from "./handlers/modals";
import { safeRespond } from "./handlers/utils";

const event: EventFile<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction, client): Promise<void> {
    try {
      // 1. Autocompletado
      if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction, client);
        return;
      }

      // 2. Slash Commands & Context Menus (handleCommands aplica acquireInteractionLock)
      if (
        interaction.isChatInputCommand() ||
        interaction.isContextMenuCommand()
      ) {
        await handleCommands(interaction, client);
        return;
      }

      // Deduplicación centralizada por interaction.id para componentes y modales
      const locked = await acquireInteractionLock(interaction.id);
      if (!locked) return;

      // 3. Modales y Botones de la racha (El handler de Racha captura ModalSubmits también)
      if (
        (interaction.isButton() ||
          interaction.isAnySelectMenu() ||
          interaction.isModalSubmit()) &&
        interaction.customId.startsWith("racha_")
      ) {
        await handleComponents(interaction as any, client);
        return;
      }

      // 4. Componentes generales (Botones y cualquier Menú desplegable)
      if (interaction.isButton() || interaction.isAnySelectMenu()) {
        await handleComponents(interaction as any, client);
        return;
      }

      // 5. Modales (Reportes, Confesiones, Sugerencias)
      if (interaction.isModalSubmit()) {
        await handleModals(interaction, client);
        return;
      }
    } catch (error) {
      console.error("❌ Error centralizado en interactionCreate:", error);
      if (!interaction.isAutocomplete()) {
        await safeRespond(interaction as any, {
          content: "😿 Ocurrió un error al procesar esta interacción.",
          ephemeral: true,
        });
      }
    }
  },
};

export default event;
