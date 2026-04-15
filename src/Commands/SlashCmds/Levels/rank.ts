import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { totalXpForLevel, xpForLevel } from "../../../Features/levelHandler";
import { HoshikoClient } from "../../../index";
import GlobalLevel from "../../../Models/GlobalLevel";
import LocalLevel from "../../../Models/LocalLevels";
import { generateServerRankBanner } from "../../../Utils/LevelBanners";

export default {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("🌸 Muestra tu nivel y XP en este servidor")
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

    const displayName =
      interaction.guild?.members.cache.get(target.id)?.displayName ??
      target.username;

    if (!profile) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`🌸 Rango de ${displayName}`)
            .setDescription(
              `**${displayName}** todavía no ha enviado mensajes en este servidor.\n\n` +
                `💬 Envía algunos mensajes para empezar a ganar XP y subir de nivel~`,
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
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

    const rank =
      (await LocalLevel.countDocuments({
        guildId: interaction.guildId!,
        xp: { $gt: profile.xp },
      })) + 1;

    const globalProfile = await GlobalLevel.findOne({ userId: target.id });
    const globalRank = globalProfile
      ? (await GlobalLevel.countDocuments({
          globalXp: { $gt: globalProfile.globalXp },
        })) + 1
      : undefined;

    // Intentar generar banner con canvas
    try {
      const avatarUrl = target.displayAvatarURL({
        extension: "png",
        size: 256,
      });
      const avatarRes = await fetch(avatarUrl);
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());

      const banner = await generateServerRankBanner({
        username: displayName,
        avatarBuffer,
        level: profile.level,
        rank,
        xpCurrent: xpIntoLevel,
        xpNeeded,
        progressPercent,
        messagesSent: profile.messagesSent,
        voiceMinutes: profile.voiceMinutes ?? 0,
        globalLevel: globalProfile?.globalLevel,
        globalRank,
      });

      if (banner) {
        return interaction.editReply({ files: [banner] });
      }
    } catch (err) {
      console.error("[rank] Error generando banner canvas:", err);
    }

    // Fallback: embed de texto
    const bar = buildProgressBar(progressPercent);
    const xpToNextLevel = nextLevelXp - profile.xp;
    const isMilestone = [5, 10, 15, 20, 25, 30, 50, 75, 100].includes(
      profile.level,
    );
    const milestoneEmoji = isMilestone ? "⭐" : "";

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setAuthor({
        name: `${displayName} ${milestoneEmoji}`,
        iconURL: target.displayAvatarURL(),
      })
      .setTitle(
        `${isMilestone ? "⭐ " : ""}Nivel ${profile.level}${isMilestone ? " ⭐" : ""}`,
      )
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        {
          name: "📊 Posición",
          value: `**#${rank}** en el servidor`,
          inline: true,
        },
        {
          name: "💬 Mensajes",
          value: `\`${profile.messagesSent.toLocaleString()}\``,
          inline: true,
        },
        {
          name: " Voz",
          value: profile.voiceMinutes
            ? `${profile.voiceMinutes.toLocaleString()} min`
            : "Sin actividad",
          inline: true,
        },
        {
          name: "⚡ XP Total",
          value: `\`${profile.xp.toLocaleString()}\` XP`,
          inline: true,
        },
        ...(globalProfile
          ? [
              {
                name: "🌐 Global",
                value: `Nivel ${globalProfile.globalLevel} • #${globalRank}`,
                inline: true,
              },
            ]
          : []),
        { name: "📈 Progreso", value: bar, inline: false },
        {
          name: "🎯 Siguiente nivel",
          value:
            `\`${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()}\` XP (**${progressPercent}%**)\n` +
            `Faltan \`${xpToNextLevel.toLocaleString()}\` XP para nivel ${profile.level + 1}`,
          inline: false,
        },
      )
      .setFooter({
        text: `Hoshiko Levels 🌸 • ${interaction.guild?.name || "Servidor"}`,
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

function buildProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return (
    "```" +
    "█".repeat(Math.max(0, filled)) +
    "░".repeat(Math.max(0, empty)) +
    "``` " +
    `**${percent}%**`
  );
}
