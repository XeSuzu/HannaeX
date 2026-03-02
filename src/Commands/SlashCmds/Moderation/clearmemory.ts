import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";
import { UserMemoryManager } from "../../../Database/UserMemoryManager";

const command: SlashCommand = {
  category: "IA",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("clearmemory")
    .setDescription("🧠 Borra lo que Hoshiko recuerda sobre ti"),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    await UserMemoryManager.clearGuildMemory(interaction.guild!.id);

    await interaction.editReply({
      content: "🧹 Listo, borré todo lo que sabía sobre ti. Empezamos de cero~ 🐾",
    });
  },
};

export default command;
