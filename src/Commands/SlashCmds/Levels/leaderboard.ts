import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top 10 de usuarios por XP en este servidor"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const top = await LocalLevel.find({ guildId: interaction.guildId! })
      .sort({ xp: -1 })
      .limit(10);

    if (!top.length) {
      return interaction.editReply(
        "Nadie tiene XP todavía en este servidor. 🌱",
      );
    }

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name = user?.username ?? `Usuario desconocido`;
        const medals = ["🥇", "🥈", "🥉"];
        const prefix = medals[i] ?? `\`#${i + 1}\``;
        return `${prefix} **${name}** — Nivel \`${p.level}\` • \`${p.xp} XP\``;
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🏆 Leaderboard — ${interaction.guild?.name}`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Hoshiko Levels 🐾" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
