import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { snipes } from "../../../Events/Client/Guilds/messageDelete";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
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
    if (!interaction.guildId) {
      await interaction.editReply({
        content: "❌ Este comando solo se puede usar en un servidor.",
      });
      return;
    }

    const settings = await SettingsManager.getSettings(interaction.guildId);
    if (!settings?.securityModules?.snipe) {
      await interaction.editReply({
        content: "❌ El comando snipe está desactivado en este servidor.",
      });
      return;
    }

    const position = interaction.options.getInteger("numero") || 1;
    const index = position - 1;
    const channelSnipes = snipes.get(interaction.channelId);

    if (!channelSnipes || !channelSnipes[index]) {
      await interaction.editReply({
        content:
          index === 0
            ? "Nyaa~ no hay mensajes borrados recientes en este canal. 🧹"
            : `Solo tengo guardados **${channelSnipes?.length || 0}** mensajes borrados aquí.`,
      });
      return;
    }

    const msg = channelSnipes[index];

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setAuthor({ name: `${msg.author} borró esto:`, iconURL: msg.authorAvatar })
      .setDescription(msg.content)
      .setFooter({ text: `Snipe ${position}/${channelSnipes.length} • Atrapado por Hoshiko 🐾` })
      .setTimestamp(msg.timestamp);

    if (msg.image) embed.setImage(msg.image);

    await interaction.editReply({ embeds: [embed] });
  },
};
export default command;
