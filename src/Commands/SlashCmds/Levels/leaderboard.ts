import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PER_PAGE = 10;
const COLLECTOR_TIMEOUT = 60_000;

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const TIER_ICONS = ["👑", "⭐", "✨", "💫", "🌟", "🔥", "💎", "🎯", "🎖️", "🏅"];

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🏆 Top de usuarios por XP en este servidor")
    .addIntegerOption((o) =>
      o
        .setName("pagina")
        .setDescription("Página inicial (1-10)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const totalUsers = await LocalLevel.countDocuments({
      guildId: interaction.guildId!,
    });

    if (totalUsers === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🏆 Leaderboard")
            .setDescription(
              `Aún no hay usuarios en el ranking de este servidor.\n\n` +
                `💬 ¡Sé el primero en ganar XP y aparecer aquí!`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    const totalPages = Math.ceil(totalUsers / PER_PAGE);
    let page = Math.min(
      interaction.options.getInteger("pagina") ?? 1,
      totalPages,
    );

    // ─── Renderizar página ────────────────────────────────────────────────────
    const buildPage = async (p: number) => {
      const skip = (p - 1) * PER_PAGE;
      const top = await LocalLevel.find({ guildId: interaction.guildId! })
        .sort({ level: -1, xp: -1 })
        .skip(skip)
        .limit(PER_PAGE);

      // Posición del usuario que ejecuta
      const selfProfile = await LocalLevel.findOne({
        userId: interaction.user.id,
        guildId: interaction.guildId!,
      });
      const selfRank = selfProfile
        ? (await LocalLevel.countDocuments({
            guildId: interaction.guildId!,
            $or: [
              { level: { $gt: selfProfile.level } },
              { level: selfProfile.level, xp: { $gt: selfProfile.xp } },
            ],
          })) + 1
        : null;

      // Avatar del #1 solo en página 1
      const topUser =
        p === 1
          ? await client.users.fetch(top[0]?.userId).catch(() => null)
          : null;
      const topAvatar =
        topUser?.displayAvatarURL({ size: 128, extension: "png" }) ?? null;

      const lines = await Promise.all(
        top.map(async (entry, i) => {
          const position = skip + i + 1;
          const user = await client.users.fetch(entry.userId).catch(() => null);
          const displayName = user?.displayName ?? `Usuario desconocido`;

          const level = Math.max(0, entry.level ?? 0);
          const xp = Math.max(0, entry.xp ?? 0);
          const xpIntoLevel = Math.max(0, xp - calculateTotalXpForLevel(level));
          const xpNeeded = Math.max(1, calculateXpForLevel(level));
          const pct = Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));

          const icon = MEDALS[position] ?? TIER_ICONS[i] ?? `\`#${position}\``;
          const isSelf = user?.id === interaction.user.id;
          const nameFmt = isSelf
            ? `**__${displayName}__**`
            : `**${displayName}**`;

          if (position <= 3) {
            return (
              `${icon} ${nameFmt}\n` +
              `> 🎯 Nivel **${level}** · ⚡ \`${xp.toLocaleString()}\` XP\n` +
              `> ${buildMiniBar(pct)} ${pct}%`
            );
          }
          return `${icon} ${nameFmt} — Nv. **${level}** · \`${xp.toLocaleString()}\` XP`;
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setAuthor({
          name: `🏆 Leaderboard — ${interaction.guild?.name ?? "Servidor"}`,
          iconURL: interaction.guild?.iconURL({ size: 64 }) ?? undefined,
        })
        .setThumbnail(topAvatar)
        .setDescription(lines.join("\n\n"))
        .addFields(
          {
            name: "📊 Estadísticas",
            value:
              `👥 **${totalUsers.toLocaleString()}** usuarios rankeados\n` +
              (selfRank
                ? `📍 Tu posición: **#${selfRank}** · Nv. **${selfProfile?.level ?? 0}**`
                : `📍 Aún no tienes XP en este servidor`),
            inline: true,
          },
          {
            name: "📖 Página",
            value: `**${p}** / **${totalPages}**`,
            inline: true,
          },
        )
        .setFooter({
          text: `Hoshiko Levels 🌸 · Top ${skip + 1}–${Math.min(skip + PER_PAGE, totalUsers)}`,
          iconURL: client.user?.displayAvatarURL(),
        })
        .setTimestamp();

      return embed;
    };

    // ─── Botones ──────────────────────────────────────────────────────────────
    const buildRow = (p: number, disabled = false) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lb_first")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || p === 1),
        new ButtonBuilder()
          .setCustomId("lb_prev")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || p === 1),
        new ButtonBuilder()
          .setCustomId("lb_page")
          .setLabel(`${p} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("lb_next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || p === totalPages),
        new ButtonBuilder()
          .setCustomId("lb_last")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || p === totalPages),
      );

    // ─── Respuesta inicial ────────────────────────────────────────────────────
    const embed = await buildPage(page);
    const msg = await interaction.editReply({
      embeds: [embed],
      components: totalPages > 1 ? [buildRow(page)] : [],
    });

    if (totalPages <= 1) return;

    // ─── Collector de botones ─────────────────────────────────────────────────
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      idle: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (btnInteraction) => {
      switch (btnInteraction.customId) {
        case "lb_first":
          page = 1;
          break;
        case "lb_prev":
          page = Math.max(1, page - 1);
          break;
        case "lb_next":
          page = Math.min(totalPages, page + 1);
          break;
        case "lb_last":
          page = totalPages;
          break;
      }

      const newEmbed = await buildPage(page);
      await btnInteraction.update({
        embeds: [newEmbed],
        components: [buildRow(page)],
      });
    });

    // ─── Timeout → desactivar botones ────────────────────────────────────────
    collector.on("end", async () => {
      await interaction
        .editReply({
          components: [buildRow(page, true)],
        })
        .catch(() => null);
    });
  },
};

// ─── Utils ────────────────────────────────────────────────────────────────────
function calculateXpForLevel(level: number): number {
  return 100 + level * 50;
}

function calculateTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += calculateXpForLevel(i);
  return total;
}

function buildMiniBar(percent: number): string {
  const filled = Math.round(percent / 10);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, 10 - filled));
}
