// src/Commands/SlashCmds/Fun/snipe.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { Snipe } from "../../../Models/snipe";
import { SettingsManager } from "../../../Database/SettingsManager";

const command: SlashCommand = {
  category: "Fun",
  ephemeral: true,
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Recupera mensajes borrados recientemente 🕵️‍♀️")
    .addIntegerOption((opt) =>
      opt
        .setName("numero")
        .setDescription("Qué mensaje ver (1 = último borrado, 2 = penúltimo...)")
        .setMinValue(1)
        .setMaxValue(10),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    // Verificar si snipe está habilitado en el servidor
    const settings = await SettingsManager.getSettings(interaction.guildId!);
    if (!settings?.securityModules?.snipe) {
      await interaction.editReply({
        content: "❌ El comando snipe está desactivado en este servidor. Un administrador puede activarlo con `/setup`.",
      });
      return;
    }

    const position = interaction.options.getInteger("numero") || 1;
    const index    = position - 1;

    const doc = await Snipe.findOne({ channelId: interaction.channelId });

    if (!doc || !doc.snipes.length || !doc.snipes[index]) {
      await interaction.editReply({
        content:
          index === 0
            ? "Nyaa~ no hay mensajes borrados recientes en este canal. 🧹"
            : `Solo tengo guardados **${doc?.snipes.length || 0}** mensajes borrados aquí.`,
      });
      return;
    }

    const msg = doc.snipes[index];

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setAuthor({ name: `${msg.author} borró esto:`, iconURL: msg.authorAvatar })
      .setDescription(msg.content)
      .setFooter({
        text: `Snipe ${position}/${doc.snipes.length} • Atrapado por Hoshiko 🐾 • Expira en 1h`,
      })
      .setTimestamp(msg.deletedAt);

    if (msg.image) embed.setImage(msg.image);

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;