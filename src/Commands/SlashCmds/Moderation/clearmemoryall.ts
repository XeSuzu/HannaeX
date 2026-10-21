import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { UserMemoryManager } from "../../../Database/ai/UserMemoryManager";

const command: SlashCommand = {
  category: "AI",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("clearmemoryall")
    .setDescription("🧠 [ADMIN] Borra la memoria de Hoshiko de todos los usuarios en este servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) {
      await interaction.editReply({
        content: "❌ Este comando solo puede utilizarse dentro de un servidor.",
      });
      return;
    }

    const ownerId = process.env.BOT_OWNER_ID || client.application?.owner?.id;
    const isBotOwner = Boolean(ownerId && interaction.user.id === ownerId);
    const isGuildOwner = interaction.guild.ownerId === interaction.user.id;
    const hasManageGuild = Boolean(
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator),
    );

    if (!isBotOwner && !isGuildOwner && !hasManageGuild) {
      await interaction.editReply({
        content: "⛔ No tienes permisos suficientes para borrar la memoria de este servidor (se requiere el permiso Gestionar Servidor).",
      });
      return;
    }

    await UserMemoryManager.clearGuildMemory(interaction.guild.id);

    await interaction.editReply({
      content: "🧹 Memoria del servidor borrada. Hoshiko ha olvidado los recuerdos de todos los usuarios en este servidor. 🐾",
    });
  },
};

export default command;
