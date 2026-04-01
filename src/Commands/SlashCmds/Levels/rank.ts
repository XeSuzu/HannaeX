import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { totalXpForLevel, xpForLevel } from "../../../Features/levelHandler";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

// ============================================
// CONFIGURACIÓN DE BANNERS PARA CANVAS (FUTURO)
// ============================================
// Para implementar banners con canvas, usa esta estructura:
//
// 1. Importar Canvas o Jimp
// 2. Usar generateRankBanner(user, level, xp, rank, etc.)
// 3. Generar imagen en memoria como Buffer
// 4. Crear AttachmentBuilder con el buffer
//
// Ejemplo de estructura para el banner:
// - Fondo: Gradiente rosa/sakura customizable
// - Avatar del usuario con borde circular
// - Nombre de usuario y tag
// - Nivel con badge decorativo
// - Barra de progreso animada
// - Posición en el ranking
// - Estadísticas (XP, mensajes)
// - Decoraciones sakura

export interface RankBannerConfig {
  backgroundColor?: string;
  accentColor?: string;
  showBanner?: boolean;
  style?: "sakura" | "ocean" | "sunset" | "custom";
}

export async function generateRankBanner(
  user: any,
  level: number,
  xp: number,
  rank: number,
  progressPercent: number,
  config?: RankBannerConfig,
): Promise<AttachmentBuilder | null> {
  // Placeholder para implementación futura con canvas
  // Por ahora retorna null para usar el embed
  return null;
}

// Función interna para generar banner
async function createRankBanner(
  target: any,
  level: number,
  xp: number,
  rank: number,
  progressPercent: number,
  config?: RankBannerConfig,
): Promise<AttachmentBuilder | null> {
  return generateRankBanner(target, level, xp, rank, progressPercent, config);
}

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
    .addBooleanOption((o) =>
      o
        .setName("banner")
        .setDescription("Generar banner visual (experimental)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const showBanner = interaction.options.getBoolean("banner") ?? false;

    // Defer para dar tiempo a procesar
    await interaction.deferReply();

    const profile = await LocalLevel.findOne({
      userId: target.id,
      guildId: interaction.guildId!,
    });

    if (!profile) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle(`🌸 Rango de ${target.displayName}`)
            .setDescription(
              `**${target.displayName}** todavía no ha enviado mensajes en este servidor.\n\n` +
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
    const bar = buildProgressBar(progressPercent);

    // Rank global en el servidor
    const rank =
      (await LocalLevel.countDocuments({
        guildId: interaction.guildId!,
        xp: { $gt: profile.xp },
      })) + 1;

    // Calcular XP para el siguiente nivel
    const xpToNextLevel = nextLevelXp - profile.xp;

    // Verificar si es milestone
    const isMilestone = [5, 10, 15, 20, 25, 30, 50, 75, 100].includes(
      profile.level,
    );
    const milestoneEmoji = isMilestone ? "⭐" : "";

    // Generar banner si se solicitó (futuro)
    let attachment: AttachmentBuilder | null = null;
    if (showBanner) {
      attachment = await createRankBanner(
        target,
        profile.level,
        profile.xp,
        rank,
        progressPercent,
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setAuthor({
        name: `${target.displayName} ${milestoneEmoji}`,
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
          name: "⚡ XP Total",
          value: `\`${profile.xp.toLocaleString()}\` XP`,
          inline: true,
        },
        {
          name: "📈 Progreso",
          value: `${bar}`,
          inline: false,
        },
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

    const payload: any = { embeds: [embed] };
    if (attachment) {
      payload.files = [attachment];
    }

    return interaction.editReply(payload);
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
