import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import GlobalLevel, { ACHIEVEMENTS } from "../../../Models/GlobalLevel";

export default {
  data: new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("🏆 Ver tus logros globales y disponibles")
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

    const globalProfile = await GlobalLevel.findOne({ userId: target.id });

    if (!globalProfile) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`🏆 Logros de ${target.displayName}`)
            .setDescription(
              `**${target.displayName}** aún no tiene logros.\n\n` +
                `💬 ¡Participa para desbloquear tus primeros logros!`,
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: "Hoshiko Global Achievements ✨" })
            .setTimestamp(),
        ],
      });
    }

    const unlockedAchievements = globalProfile.achievements || [];
    const totalAchievements = ACHIEVEMENTS.length;

    // Agrupar logros por categoría
    const levelAchievements = ACHIEVEMENTS.filter((a) =>
      a.id.startsWith("level_"),
    );
    const messageAchievements = ACHIEVEMENTS.filter((a) =>
      a.id.startsWith("messages_"),
    );
    const voiceAchievements = ACHIEVEMENTS.filter((a) =>
      a.id.startsWith("voice_"),
    );
    const streakAchievements = ACHIEVEMENTS.filter((a) =>
      a.id.startsWith("streak_"),
    );
    const otherAchievements = ACHIEVEMENTS.filter(
      (a) =>
        !a.id.startsWith("level_") &&
        !a.id.startsWith("messages_") &&
        !a.id.startsWith("voice_") &&
        !a.id.startsWith("streak_"),
    );

    const createAchievementList = (
      achievements: typeof ACHIEVEMENTS,
      title: string,
    ) => {
      const list = achievements
        .map((ach) => {
          const unlocked = unlockedAchievements.includes(ach.id);
          const status = unlocked ? "✅" : "🔒";
          const name = unlocked ? `**${ach.name}**` : `~~${ach.name}~~`;
          return `${status} ${ach.emoji} ${name} (${ach.nameEn})`;
        })
        .join("\n");

      return `**${title}**\n${list}`;
    };

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🏆 Logros de ${target.displayName}`)
      .setDescription(
        `**Progreso: ${unlockedAchievements.length}/${totalAchievements} logros desbloqueados**\n\n` +
          createAchievementList(levelAchievements, "📊 Por Nivel") +
          "\n\n" +
          createAchievementList(messageAchievements, "💬 Por Mensajes") +
          "\n\n" +
          createAchievementList(voiceAchievements, "🎤 Por Voz") +
          "\n\n" +
          createAchievementList(streakAchievements, "🔥 Por Rachas") +
          "\n\n" +
          createAchievementList(otherAchievements, "🌟 Especiales"),
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({
        text: `Hoshiko Global Achievements ✨ • ${unlockedAchievements.length}/${totalAchievements} completados`,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
