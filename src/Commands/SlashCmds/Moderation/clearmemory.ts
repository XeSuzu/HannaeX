import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { UserMemoryManager } from "../../../Database/ai/UserMemoryManager";

const command: SlashCommand = {
  category: "AI",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("clearmemory")
    .setDescription("🧠 Borra lo que Hoshiko recuerda sobre ti"),

  async execute(interaction: ChatInputCommandInteraction, _client: HoshikoClient): Promise<void> {
    if (!interaction.guild) {
      await interaction.editReply({
        content: "❌ Este comando solo puede utilizarse dentro de un servidor.",
      });
      return;
    }

    await UserMemoryManager.clearMemory(interaction.user.id, interaction.guild.id);

    await interaction.editReply({
      content: "🧹 Listo, borré todo lo que sabía sobre ti en este servidor. Empezamos de cero~ 🐾",
    });
  },
};

export default command;
