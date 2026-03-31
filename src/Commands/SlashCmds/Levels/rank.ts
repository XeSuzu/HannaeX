import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { totalXpForLevel, xpForLevel } from "../../../Features/levelHandler";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Muestra tu nivel y XP en este servidor")
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Usuario a consultar")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;

    const profile = await LocalLevel.findOne({
      userId: target.id,
      guildId: interaction.guildId!,
    });

    if (!profile) {
      return interaction.editReply({
        content: `${target.displayName} todavía no tiene XP en este servidor. 🌱`,
      });
    }

    const currentLevelXp = totalXpForLevel(profile.level);
    const nextLevelXp = totalXpForLevel(profile.level + 1);
    const xpIntoLevel = profile.xp - currentLevelXp;
    const xpNeeded = xpForLevel(profile.level);
    const progressPercent = Math.min(
      100,
      Math.floor((xpIntoLevel / xpNeeded) * 100),
    );
    const bar = buildProgressBar(progressPercent);

    // Rank global en el servidor
    const rank =
      (await LocalLevel.countDocuments({
        guildId: interaction.guildId!,
        xp: { $gt: profile.xp },
      })) + 1;

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🌸 Rango de ${target.displayName}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Nivel", value: `\`${profile.level}\``, inline: true },
        { name: "Rank", value: `\`#${rank}\``, inline: true },
        {
          name: "Mensajes",
          value: `\`${profile.messagesSent}\``,
          inline: true,
        },
        {
          name: `XP — ${xpIntoLevel} / ${xpNeeded}`,
          value: `${bar} ${progressPercent}%`,
        },
      )
      .setFooter({ text: "Hoshiko Levels 🐾" });

    return interaction.editReply({ embeds: [embed] });
  },
};

function buildProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
