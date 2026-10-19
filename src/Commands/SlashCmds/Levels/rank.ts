import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { totalXpForLevel, xpForLevel } from "../../../Features/levelHandler";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import LocalLevel from "../../../Database/leveling/localLevel.model";
import GlobalProfile from "../../../Database/moderation/globalProfile.model";
import {
  generateServerRankBanner,
  LEVEL_CARD_THEMES,
} from "../../../Utils/LevelBanners";

export default {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("🌸 Muestra tu nivel y XP en este servidor")
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Usuario a consultar")
        .setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName("fondo")
        .setDescription("🎨 Cambia o restablece el fondo de tu tarjeta de nivel")
        .setRequired(false)
        .addChoices(
          ...Object.values(LEVEL_CARD_THEMES).map((theme) => ({
            name: `${theme.emoji} ${theme.name}`,
            value: theme.id,
          })),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const selectedBg = interaction.options.getString("fondo");
    const target = selectedBg
      ? interaction.user
      : (interaction.options.getUser("usuario") ?? interaction.user);

    let userGlobalProfile = await GlobalProfile.findOne({ userId: target.id });

    if (selectedBg && LEVEL_CARD_THEMES[selectedBg]) {
      userGlobalProfile = await GlobalProfile.findOneAndUpdate(
        { userId: interaction.user.id },
        {
          $set: { "theme.background": selectedBg },
          $addToSet: { unlockedBackgrounds: selectedBg },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }

    const backgroundTheme = userGlobalProfile?.theme?.background ?? "default";

    const profile = await LocalLevel.findOne({
      userId: target.id,
      guildId: interaction.guildId!,
    });

    const displayName =
      interaction.guild?.members.cache.get(target.id)?.displayName ??
      target.username;

    if (!profile) {
      const themeNote =
        selectedBg && LEVEL_CARD_THEMES[selectedBg]
          ? `\n\n🎨 Fondo actualizado a **${LEVEL_CARD_THEMES[selectedBg].emoji} ${LEVEL_CARD_THEMES[selectedBg].name}**.`
          : "";
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`🌸 Rango de ${displayName}`)
            .setDescription(
              `**${displayName}** todavía no ha enviado mensajes en este servidor.\n\n` +
                `💬 Envía algunos mensajes para ganar XP y empezar a subir de nivel, nya.${themeNote}`,
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: `Hoshiko 🌸 • ${interaction.guild?.name || "Servidor"}` })
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
        backgroundTheme,
      });

      if (banner) {
        const content =
          selectedBg && LEVEL_CARD_THEMES[selectedBg]
            ? `🎨 Tu fondo de tarjeta se actualizó a **${LEVEL_CARD_THEMES[selectedBg].emoji} ${LEVEL_CARD_THEMES[selectedBg].name}**.`
            : undefined;
        return interaction.editReply({ content, files: [banner] });
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
        name: `${displayName} ${milestoneEmoji}`.trim(),
        iconURL: target.displayAvatarURL(),
      })
      .setTitle(
        isMilestone ? `⭐ Nivel ${profile.level}` : `Nivel ${profile.level}`,
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
          name: "🎙️ Voz",
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
        { name: "📈 Progreso", value: bar, inline: false },
        {
          name: "🎯 Siguiente nivel",
          value:
            `\`${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()}\` XP (**${progressPercent}%**)\n` +
            `Faltan \`${xpToNextLevel.toLocaleString()}\` XP para nivel ${profile.level + 1}`,
          inline: false,
        },
        {
          name: "🌐 Rango Global",
          value: "ℹ️ El sistema de rango global se encuentra temporalmente desactivado por mantenimiento.",
          inline: false,
        },
      )
      .setFooter({
        text: `Hoshiko 🌸 • ${interaction.guild?.name || "Servidor"}`,
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
