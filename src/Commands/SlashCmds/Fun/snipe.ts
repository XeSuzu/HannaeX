// src/Commands/SlashCmds/Fun/snipe.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import {
  buildSnipeEmbed,
  buildSnipeNotFoundMessage,
  getSnipeEntry,
  SNIPE_MAX_ENTRIES,
} from "../../../Utils/snipe";

const command: SlashCommand = {
  category: "Fun",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Recupera el último mensaje borrado en este canal 🕵️‍♀️")
    .addIntegerOption((opt) =>
      opt
        .setName("numero")
        .setDescription(
          "Qué mensaje ver (1 = último borrado, 2 = penúltimo...)",
        )
        .setMinValue(1)
        .setMaxValue(SNIPE_MAX_ENTRIES),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // 1. Verificar si snipe está habilitado en el servidor
    const settings = await SettingsManager.getSettings(interaction.guildId!);
    if (!settings?.securityModules?.snipe) {
      await interaction.editReply({
        content:
          "❌ El comando snipe está desactivado en este servidor. Un administrador puede activarlo con `/setup`.",
      });
      return;
    }

    const position = interaction.options.getInteger("numero") || 1;
    const { total, entry } = await getSnipeEntry(
      interaction.channelId,
      position,
    );

    if (!total || !entry) {
      await interaction.editReply({
        content: buildSnipeNotFoundMessage(position, total),
      });
      return;
    }

    const embed = buildSnipeEmbed(entry, position, total);
    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
