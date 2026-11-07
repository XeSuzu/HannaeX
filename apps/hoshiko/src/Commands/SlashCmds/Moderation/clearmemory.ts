import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { PersonalMemoryService } from "../../../Core/AI/Memory/PersonalMemoryService";

const command: SlashCommand = {
  category: "AI",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("clearmemory")
    .setDescription("🧠 Borra lo que Hoshiko recuerda sobre ti"),

  async execute(interaction: ChatInputCommandInteraction, _client: HoshikoClient): Promise<void> {
    await PersonalMemoryService.clearAllFacts(interaction.user.id);

    await interaction.editReply({
      content: "🧹 Listo, borré todo lo que sabía sobre ti. Empezamos de cero~ 🌸",
    });
  },
};

export default command;
