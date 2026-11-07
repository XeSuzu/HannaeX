import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import LocalLevel from "../../../Database/leveling/localLevel.model";
import {
  totalXpForLevel,
  xpForLevel,
  totalXpForVoiceLevel,
  xpForVoiceLevel,
} from "../../../Features/leveling/xpRules";

const PER_PAGE = 10;
const COLLECTOR_TIMEOUT = 90_000;

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const TIER_ICONS = ["👑", "⭐", "✨", "💫", "🌟", "🔥", "💎", "🎯", "🎖️", "🏅"];

export type LeaderboardCategory = "text" | "voice" | "weekly";

export default {
  category: "Levels",
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🏆 Top de usuarios en este servidor (Texto, Voz y Semanal)")
    .addStringOption((o) =>
      o
        .setName("categoria")
        .setDescription("Categoría del ranking a visualizar")
        .setRequired(false)
        .addChoices(
          { name: "💬 Texto (Nivel y Mensajes)", value: "text" },
          { name: "🎙️ Voz (Horas y Nivel VC)", value: "voice" },
          { name: "⚡ Semanal (XP últimos 7 días)", value: "weekly" },
        ),
    )
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
    let category: LeaderboardCategory =
      (interaction.options.getString("categoria") as LeaderboardCategory) || "text";

    const guildId = interaction.guildId!;

    // ─── Renderizador de vista según categoría ────────────────────────────────
    const renderCategory = async (cat: LeaderboardCategory, p: number) => {
      let filter: Record<string, any> = { guildId };
      let sort: Record<string, any> = { level: -1, xp: -1 };
      let embedColor = 0xffb7c5;
      let title = `🏆 Leaderboard de Texto — ${interaction.guild?.name ?? "Servidor"}`;

      if (cat === "voice") {
        filter = { guildId, voiceMinutes: { $gt: 0 } };
        sort = { voiceMinutes: -1, voiceXp: -1, voiceLevel: -1 };
        embedColor = 0x67e8f9;
        title = `🎙️ Leaderboard de Voz — ${interaction.guild?.name ?? "Servidor"}`;
      } else if (cat === "weekly") {
        filter = { guildId, weeklyXp: { $gt: 0 } };
        sort = { weeklyXp: -1, weeklyMessages: -1, xp: -1 };
        embedColor = 0xffd700;
        title = `⚡ Leaderboard Semanal — ${interaction.guild?.name ?? "Servidor"}`;
      }

      const totalDocs = await LocalLevel.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(totalDocs / PER_PAGE));
      const currentPage = Math.min(Math.max(1, p), totalPages);
      const skip = (currentPage - 1) * PER_PAGE;

      if (totalDocs === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(title)
          .setDescription(
            cat === "voice"
              ? "Aún no hay miembros con tiempo de voz registrado en este servidor.\n\n🎤 ¡Entra a un canal de voz con otros miembros para aparecer aquí!"
              : cat === "weekly"
                ? "Esta semana aún no hay actividad registrada en este servidor.\n\n💬 ¡Sé el primero en ganar XP esta semana!"
                : "Aún no hay usuarios en el ranking de este servidor.\n\n💬 ¡Sé el primero en ganar XP y aparecer aquí!",
          )
          .setFooter({ text: `Hoshiko 🌸 • ${interaction.guild?.name || "Servidor"}` })
          .setTimestamp();
        return { embed: emptyEmbed, totalPages: 1, currentPage: 1, totalDocs: 0 };
      }

      const top = await LocalLevel.find(filter).sort(sort).skip(skip).limit(PER_PAGE);

      // Posición del usuario que ejecuta
      const selfProfile = await LocalLevel.findOne({ userId: interaction.user.id, guildId });
      let selfRank: number | null = null;
      if (selfProfile) {
        if (cat === "text") {
          selfRank =
            (await LocalLevel.countDocuments({
              guildId,
              $or: [
                { level: { $gt: selfProfile.level } },
                { level: selfProfile.level, xp: { $gt: selfProfile.xp } },
              ],
            })) + 1;
        } else if (cat === "voice" && (selfProfile.voiceMinutes ?? 0) > 0) {
          selfRank =
            (await LocalLevel.countDocuments({
              guildId,
              $or: [
                { voiceMinutes: { $gt: selfProfile.voiceMinutes } },
                { voiceMinutes: selfProfile.voiceMinutes, voiceXp: { $gt: selfProfile.voiceXp } },
              ],
            })) + 1;
        } else if (cat === "weekly" && (selfProfile.weeklyXp ?? 0) > 0) {
          selfRank =
            (await LocalLevel.countDocuments({
              guildId,
              $or: [
                { weeklyXp: { $gt: selfProfile.weeklyXp } },
                { weeklyXp: selfProfile.weeklyXp, weeklyMessages: { $gt: selfProfile.weeklyMessages } },
              ],
            })) + 1;
        }
      }

      // Avatar del #1 solo en pág 1
      const topUserId = top[0]?.userId;
      const topUser =
        currentPage === 1 && topUserId
          ? (interaction.guild?.members.cache.get(topUserId)?.user ??
            client.users.cache.get(topUserId) ??
            (await client.users.fetch(topUserId).catch(() => null)))
          : null;
      const topAvatar =
        typeof topUser?.displayAvatarURL === "function"
          ? topUser.displayAvatarURL({ size: 128, extension: "png" })
          : null;

      const lines = await Promise.all(
        top.map(async (entry, i) => {
          const position = skip + i + 1;
          const member = interaction.guild?.members.cache.get(entry.userId);
          const cachedUser = member?.user ?? client.users.cache.get(entry.userId);
          const user = cachedUser ?? (await client.users.fetch(entry.userId).catch(() => null));
          const displayName =
            member?.displayName ?? user?.displayName ?? user?.username ?? `Usuario desconocido`;

          const isSelf = entry.userId === interaction.user.id;
          const nameFmt = isSelf ? `**__${displayName}__**` : `**${displayName}**`;
          const icon = MEDALS[position] ?? `\`#${position}\``;
          const posBadge = position < 10 ? `\` #${position} \`` : `\`#${position} \``;

          if (cat === "voice") {
            const vMins = Math.max(0, entry.voiceMinutes ?? 0);
            const vLvl = Math.max(0, entry.voiceLevel ?? 0);
            const vXp = Math.max(0, entry.voiceXp ?? 0);
            const currentLevelXp = totalXpForVoiceLevel(vLvl);
            const xpIntoLevel = Math.max(0, vXp - currentLevelXp);
            const xpNeeded = Math.max(1, xpForVoiceLevel(vLvl));
            const pct = Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));
            const timeStr = formatVoiceTime(vMins);

            if (position <= 3) {
              return (
                `${icon} ${nameFmt}\n` +
                `> 🎙️ Nivel VC **${vLvl}** · ⏱️ \`${timeStr}\` en llamada\n` +
                `> ⚡ \`${vXp.toLocaleString()}\` XP de voz · ${buildMiniBar(pct)} ${pct}%`
              );
            }
            return `${posBadge} ${nameFmt} — VC Nv. **${vLvl}** · ⏱️ \`${timeStr}\` · ⚡ \`${vXp.toLocaleString()}\` XP`;
          }

          if (cat === "weekly") {
            const wXp = Math.max(0, entry.weeklyXp ?? 0);
            const wMsgs = Math.max(0, entry.weeklyMessages ?? 0);
            const wVoice = Math.max(0, entry.weeklyVoiceMinutes ?? 0);
            const vStr = wVoice > 0 ? ` · 🎙️ \`${formatVoiceTime(wVoice)}\`` : "";

            if (position <= 3) {
              return (
                `${icon} ${nameFmt}\n` +
                `> ⚡ **${wXp.toLocaleString()}** XP semanal\n` +
                `> 💬 \`${wMsgs.toLocaleString()}\` msgs${vStr}`
              );
            }
            return `${posBadge} ${nameFmt} — \`${wXp.toLocaleString()}\` XP sem. · 💬 \`${wMsgs.toLocaleString()}\` msgs${vStr}`;
          }

          // Cat === "text"
          const level = Math.max(0, entry.level ?? 0);
          const xp = Math.max(0, entry.xp ?? 0);
          const xpIntoLevel = Math.max(0, xp - totalXpForLevel(level));
          const xpNeeded = Math.max(1, xpForLevel(level));
          const pct = Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));
          const msgs = Math.max(0, entry.messagesSent ?? 0);
          const vMins = Math.max(0, entry.voiceMinutes ?? 0);
          const vStr = vMins > 0 ? ` · 🎙️ \`${formatVoiceTime(vMins)}\`` : "";

          if (position <= 3) {
            return (
              `${icon} ${nameFmt}\n` +
              `> 🎯 Nivel **${level}** · ⚡ \`${xp.toLocaleString()}\` XP · ${buildMiniBar(pct)} ${pct}%\n` +
              `> 💬 \`${msgs.toLocaleString()}\` msgs${vStr}`
            );
          }
          return `${posBadge} ${nameFmt} — Nivel **${level}** · \`${xp.toLocaleString()}\` XP · 💬 \`${msgs.toLocaleString()}\` msgs`;
        }),
      );

      let description = "";
      if (cat === "weekly") {
        const now = new Date();
        const nextSunday = new Date(now);
        nextSunday.setUTCDate(now.getUTCDate() + ((7 - now.getUTCDay()) % 7 || 7));
        nextSunday.setUTCHours(0, 0, 0, 0);
        const resetUnix = Math.floor(nextSunday.getTime() / 1000);
        description += `⏳ *Reinicio de temporada:* <t:${resetUnix}:R>\n\n`;
      }

      const top3Lines: string[] = [];
      const restLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const pos = skip + i + 1;
        if (pos <= 3) {
          top3Lines.push(lines[i]);
        } else {
          restLines.push(lines[i]);
        }
      }

      if (top3Lines.length > 0) {
        description += top3Lines.join("\n\n");
        if (restLines.length > 0) {
          description += "\n\n" + restLines.join("\n");
        }
      } else {
        description += restLines.join("\n");
      }

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setAuthor({
          name: `🏆 Hoshiko Leaderboards`,
          iconURL: interaction.guild?.iconURL({ size: 64 }) ?? undefined,
        })
        .setThumbnail(topAvatar)
        .setDescription(description)
        .addFields(
          {
            name: "📊 Estadísticas",
            value:
              `👥 **${totalDocs.toLocaleString()}** rankeados en esta categoría\n` +
              (selfRank
                ? `📍 Tu posición: **#${selfRank}**`
                : `📍 Aún sin actividad registrada en esta categoría`),
            inline: true,
          },
          {
            name: "📖 Página",
            value: `**${currentPage}** / **${totalPages}**`,
            inline: true,
          },
        )
        .setFooter({
          text: `Hoshiko 🌸 • Top ${skip + 1}–${Math.min(skip + PER_PAGE, totalDocs)}`,
          iconURL: client.user?.displayAvatarURL(),
        })
        .setTimestamp();

      return { embed, totalPages, currentPage, totalDocs };
    };

    // ─── Filas de Componentes (Categorías + Paginación) ─────────────────────────
    const buildComponents = (cat: LeaderboardCategory, p: number, totalP: number, disabled = false) => {
      const catRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("lb_cat_text")
          .setLabel("Texto")
          .setEmoji("💬")
          .setStyle(cat === "text" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lb_cat_voice")
          .setLabel("Voz")
          .setEmoji("🎙️")
          .setStyle(cat === "voice" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId("lb_cat_weekly")
          .setLabel("Semanal")
          .setEmoji("⚡")
          .setStyle(cat === "weekly" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled),
      );

      const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
          .setLabel(`${p} / ${totalP}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("lb_next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled || p >= totalP),
        new ButtonBuilder()
          .setCustomId("lb_last")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || p >= totalP),
      );

      return totalP > 1 ? [catRow, navRow] : [catRow];
    };

    let page = interaction.options.getInteger("pagina") ?? 1;
    let currentData = await renderCategory(category, page);

    const replyMsg = await interaction.editReply({
      embeds: [currentData.embed],
      components: buildComponents(category, currentData.currentPage, currentData.totalPages),
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      idle: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (btnInteraction) => {
      const id = btnInteraction.customId;
      if (id === "lb_cat_text") {
        category = "text";
        page = 1;
      } else if (id === "lb_cat_voice") {
        category = "voice";
        page = 1;
      } else if (id === "lb_cat_weekly") {
        category = "weekly";
        page = 1;
      } else if (id === "lb_first") {
        page = 1;
      } else if (id === "lb_prev") {
        page = Math.max(1, page - 1);
      } else if (id === "lb_next") {
        page = Math.min(currentData.totalPages, page + 1);
      } else if (id === "lb_last") {
        page = currentData.totalPages;
      }

      currentData = await renderCategory(category, page);
      await btnInteraction.update({
        embeds: [currentData.embed],
        components: buildComponents(category, currentData.currentPage, currentData.totalPages),
      });
    });

    collector.on("end", async () => {
      await interaction
        .editReply({
          components: buildComponents(category, currentData.currentPage, currentData.totalPages, true),
        })
        .catch(() => null);
    });
  },
};

function buildMiniBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return "`[" + "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty)) + "]`";
}

function formatVoiceTime(mins: number): string {
  if (mins <= 0) return "0m";
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
}
