import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";
import { UserMemoryManager } from "../../../Database/UserMemoryManager";

const command: SlashCommand = {
  category: "AI",      // 👈 "IA" → "AI" para que coincida con CATEGORIES
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("clearmemoryall")
    .setDescription("🧠 [OWNER] Borra la memoria de todos los usuarios"),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    const ownerId = process.env.BOT_OWNER_ID || client.application?.owner?.id;

    if (interaction.user.id !== ownerId) {
      await interaction.editReply({ content: "⛔ Este comando es solo para la creadora." });
      return;
    }

    await UserMemoryManager.clearMemory(interaction.user.id, interaction.guild!.id);

    await interaction.editReply({
      content: "🧹 Memoria global borrada. Hoshiko olvidó a todos en este servidor. 🐾",
    });
  },
};

export default command;
