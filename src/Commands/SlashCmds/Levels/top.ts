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

export default {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Ver los mejores usuarios del servidor")
    .addSubcommand((sub) =>
      sub
        .setName("messages")
        .setDescription("Top de usuarios por mensajes enviados"),
    )
    .addSubcommand((sub) =>
      sub.setName("voice").setDescription("Top de usuarios por tiempo en voz"),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === "messages") {
      await handlePaginatedTop(interaction, client, guildId, "messages");
    } else if (subcommand === "voice") {
      await handlePaginatedTop(interaction, client, guildId, "voice");
    }
  },
};

// ─── Builder de embed ─────────────────────────────────────────────────────────
async function buildEmbed(
  interaction: ChatInputCommandInteraction,
  client: HoshikoClient,
  guildId: string,
  type: "messages" | "voice",
  page: number,
): Promise<{ embed: EmbedBuilder; totalPages: number }> {
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const query =
    type === "voice"
      ? { guildId, voiceMinutes: { $gt: 0 } }
      : { guildId, messagesSent: { $gt: 0 } };

  // ✅ Sort consistente con /rank — mensajes también por xp primero
  const sort =
    type === "voice"
      ? { voiceXp: -1, voiceLevel: -1, voiceMinutes: -1 }
      : { level: -1, xp: -1 }; // ← era { xp: -1, messagesSent: -1 }

  const totalUsers = await LocalLevel.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));
  const top = await LocalLevel.find(query)
    .sort(sort as any)
    .skip(skip)
    .limit(perPage);

  const medals = ["🥇", "🥈", "🥉"];

  const lines = await Promise.all(
    top.map(async (p, i) => {
      const user = await client.users.fetch(p.userId).catch(() => null);
      const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
      const displayName =
        interaction.guild?.members.cache.get(p.userId)?.displayName ??
        user?.displayName ??
        name;
      const position = skip + i + 1;
      // ✅ Posiciones 4+ con número limpio sin doble #
      const medal = position <= 3 ? medals[position - 1] : `\`${position}.\``;

      if (type === "messages") {
        const level = Math.max(0, p.level ?? 0);
        const xp = Math.max(0, p.xp ?? 0);
        const msgs = Math.max(0, p.messagesSent ?? 0);

        if (position <= 3) {
          return (
            `${medal} **${displayName}**\n` +
            `   ├ Nivel ${level} • \`${xp.toLocaleString()}\` XP\n` +
            `   └ ${msgs.toLocaleString()} mensajes`
          );
        }
        return `${medal} **${displayName}** — Nv.${level} • \`${xp.toLocaleString()}\` XP`;
      } else {
        const voiceLevel = Math.max(0, p.voiceLevel ?? 0);
        const voiceXp = Math.max(0, p.voiceXp ?? 0);
        const totalMins = Math.max(0, p.voiceMinutes ?? 0);
        const timeString = formatTime(totalMins);

        if (position <= 3) {
          return (
            `${medal} **${displayName}**\n` +
            `   ├ Nivel VC ${voiceLevel} • \`${voiceXp.toLocaleString()}\` XP\n` +
            `   └ ${timeString} en voz`
          );
        }
        return `${medal} **${displayName}** — Nv.VC ${voiceLevel} • ${timeString}`;
      }
    }),
  );

  const isEmpty = lines.length === 0;
  const title =
    type === "messages"
      ? `💬 Top Mensajes — ${interaction.guild?.name}`
      : `🎤 Top Voz — ${interaction.guild?.name}`;

  const description = isEmpty
    ? type === "messages"
      ? "Aún no hay usuarios con mensajes. ¡Sé el primero! 💬"
      : "Aún no hay usuarios con tiempo en voz. ¡Únete a un canal! 🎤"
    : `**Top ${skip + 1}–${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios**\n\n` +
      lines.join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(0xffb7c5)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: `Página ${page} de ${totalPages} • Hoshiko Levels 🌸`,
      iconURL: interaction.guild?.iconURL() ?? undefined,
    })
    .setTimestamp();

  return { embed, totalPages };
}

// ─── Botones ──────────────────────────────────────────────────────────────────
function buildButtons(
  page: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("top_first")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId("top_prev")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId("top_page")
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("top_next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId("top_last")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages),
  );
}

// ─── Handler paginado con collector ──────────────────────────────────────────
async function handlePaginatedTop(
  interaction: ChatInputCommandInteraction,
  client: HoshikoClient,
  guildId: string,
  type: "messages" | "voice",
) {
  let page = 1;
  const { embed, totalPages } = await buildEmbed(
    interaction,
    client,
    guildId,
    type,
    page,
  );
  const row = buildButtons(page, totalPages);

  const reply = await interaction.editReply({
    embeds: [embed],
    components: totalPages > 1 ? [row] : [],
  });

  if (totalPages <= 1) return;

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (btn) => btn.user.id === interaction.user.id,
    time: 5 * 60_000,
  });

  collector.on("collect", async (btn) => {
    await btn.deferUpdate();

    if (btn.customId === "top_first") page = 1;
    else if (btn.customId === "top_prev") page = Math.max(1, page - 1);
    else if (btn.customId === "top_next") page = Math.min(totalPages, page + 1);
    else if (btn.customId === "top_last") page = totalPages;

    const { embed: newEmbed, totalPages: tp } = await buildEmbed(
      interaction,
      client,
      guildId,
      type,
      page,
    );

    await interaction.editReply({
      embeds: [newEmbed],
      components: [buildButtons(page, tp)],
    });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("top_first")
        .setEmoji("⏮️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_prev")
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_page")
        .setLabel(`${page} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_next")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_last")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await interaction
      .editReply({ components: [disabledRow] })
      .catch(() => null);
  });
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
