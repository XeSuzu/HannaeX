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
    .setDescription("🏆 Top de usuarios por XP en este servidor")
    .addIntegerOption((o) =>
      o
        .setName("pagina")
        .setDescription("Página del ranking (1-10)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const page = interaction.options.getInteger("pagina") ?? 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;

    const totalUsers = await LocalLevel.countDocuments({
      guildId: interaction.guildId!,
    });

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🏆 Leaderboard Local")
            .setDescription(
              `Aún no hay usuarios en el ranking de este servidor.\n\n` +
                `💬 ¡Sé el primero en ganar XP y aparecer aquí!`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    // Ordenar por level primero, luego xp como desempate
    const top = await LocalLevel.find({ guildId: interaction.guildId! })
      .sort({ level: -1, xp: -1 })
      .skip(skip)
      .limit(perPage);

    const medals = ["🥇", "🥈", "🥉"];
    const totalPages = Math.ceil(totalUsers / perPage);

    const lines = await Promise.all(
      top.map(async (p, i) => {
        const user = await client.users.fetch(p.userId).catch(() => null);
        const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
        const displayName = user?.displayName ?? name;
        const position = skip + i + 1;
        const medal = medals[i] ?? `**#${position}**`;

        // Guards contra datos corruptos
        const level = Math.max(0, p.level ?? 0);
        const xp = Math.max(0, p.xp ?? 0);
        const currentLevelXp = calculateTotalXpForLevel(level);
        const xpIntoLevel = Math.max(0, xp - currentLevelXp);
        const xpNeeded = Math.max(1, calculateXpForLevel(level));
        const progressPercent = Math.min(
          100,
          Math.floor((xpIntoLevel / xpNeeded) * 100),
        );

        if (position <= 3) {
          return `${medal} **${displayName}**\n   └─ Nivel ${level} • ${xp.toLocaleString()} XP • ${progressPercent}%`;
        } else {
          return `${medal} **${displayName}** — Nivel ${level} • ${xp.toLocaleString()} XP`;
        }
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(
        `🏆 Leaderboard Local — ${interaction.guild?.name || "Servidor"}`,
      )
      .setDescription(
        `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios**\n\n` +
          lines.join("\n\n"),
      )
      .addFields({
        name: "📖 Navegación",
        value:
          `Página **${page}** de **${totalPages}**\n` +
          `Usa \`/leaderboard pagina:${page < totalPages ? page + 1 : 1}\` para ver más`,
        inline: false,
      })
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

function calculateXpForLevel(level: number): number {
  return 100 + level * 50;
}

function calculateTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += calculateXpForLevel(i);
  return total;
}
