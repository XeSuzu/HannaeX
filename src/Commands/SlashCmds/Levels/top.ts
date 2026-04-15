import {
  ChatInputCommandInteraction,
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
        .setDescription("Top de usuarios por mensajes enviados")
        .addIntegerOption((o) =>
          o
            .setName("pagina")
            .setDescription("Página del ranking (1-10)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("voice")
        .setDescription("Top de usuarios por tiempo en voz")
        .addIntegerOption((o) =>
          o
            .setName("pagina")
            .setDescription("Página del ranking (1-10)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const subcommand = interaction.options.getSubcommand();
    const page = interaction.options.getInteger("pagina") ?? 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;
    const guildId = interaction.guildId!;

    if (subcommand === "messages") {
      await handleMessagesTop(
        interaction,
        client,
        guildId,
        page,
        perPage,
        skip,
      );
    } else if (subcommand === "voice") {
      await handleVoiceTop(interaction, client, guildId, page, perPage, skip);
    }
  },
};

async function handleMessagesTop(
  interaction: ChatInputCommandInteraction,
  client: HoshikoClient,
  guildId: string,
  page: number,
  perPage: number,
  skip: number,
) {
  const totalUsers = await LocalLevel.countDocuments({ guildId });

  if (totalUsers === 0) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("🏆 Top Mensajes")
          .setDescription(
            `Aún no hay usuarios con mensajes en este servidor.\n\n` +
              `💬 ¡Sé el primero en enviar mensajes!`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp(),
      ],
    });
  }

  const top = await LocalLevel.find({ guildId })
    .sort({ messagesSent: -1 })
    .skip(skip)
    .limit(perPage);

  const medals = ["🥇", "🥈", "🥉"];
  const totalPages = Math.ceil(totalUsers / perPage);

  const lines = await Promise.all(
    top.map(async (p, i) => {
      const user = await client.users.fetch(p.userId).catch(() => null);
      const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
      const displayName =
        interaction.guild?.members.cache.get(p.userId)?.displayName ??
        user?.username ??
        name;
      const position = skip + i + 1;
      const medal = medals[i] ?? `**#${position}**`;

      return `${medal} **${displayName}** — ${p.messagesSent.toLocaleString()} mensajes`;
    }),
  );

  const embed = new EmbedBuilder()
    .setColor(0xffb7c5)
    .setTitle(`🏆 Top Mensajes — ${interaction.guild?.name}`)
    .setDescription(
      `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios**\n\n` +
        lines.join("\n"),
    )
    .addFields({
      name: "📖 Navegación",
      value:
        `Página **${page}** de **${totalPages}**\n` +
        `Usa \`/top messages pagina:${page < totalPages ? page + 1 : 1}\` para ver más`,
      inline: false,
    })
    .setFooter({
      text: "Hoshiko Levels 🌸 • ¡Sigue chateando!",
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleVoiceTop(
  interaction: ChatInputCommandInteraction,
  client: HoshikoClient,
  guildId: string,
  page: number,
  perPage: number,
  skip: number,
) {
  const totalUsers = await LocalLevel.countDocuments({
    guildId,
    voiceMinutes: { $gt: 0 },
  });

  if (totalUsers === 0) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("🏆 Top Voz")
          .setDescription(
            `Aún no hay usuarios con tiempo en voz en este servidor.\n\n` +
              `🎤 ¡Sé el primero en unirte a un canal de voz!`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp(),
      ],
    });
  }

  const top = await LocalLevel.find({ guildId, voiceMinutes: { $gt: 0 } })
    .sort({ voiceMinutes: -1 })
    .skip(skip)
    .limit(perPage);

  const medals = ["🥇", "🥈", "🥉"];
  const totalPages = Math.ceil(totalUsers / perPage);

  const lines = await Promise.all(
    top.map(async (p, i) => {
      const user = await client.users.fetch(p.userId).catch(() => null);
      const name = user?.username ?? `Usuario #${p.userId.slice(0, 8)}`;
      const displayName =
        interaction.guild?.members.cache.get(p.userId)?.displayName ??
        user?.username ??
        name;
      const position = skip + i + 1;
      const medal = medals[i] ?? `**#${position}**`;
      const hours = Math.floor(p.voiceMinutes / 60);
      const minutes = p.voiceMinutes % 60;
      const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      return `${medal} **${displayName}** — ${timeString}`;
    }),
  );

  const embed = new EmbedBuilder()
    .setColor(0xffb7c5)
    .setTitle(`🏆 Top Voz — ${interaction.guild?.name}`)
    .setDescription(
      `**Top ${skip + 1}-${Math.min(skip + perPage, totalUsers)} de ${totalUsers.toLocaleString()} usuarios**\n\n` +
        lines.join("\n"),
    )
    .addFields({
      name: "📖 Navegación",
      value:
        `Página **${page}** de **${totalPages}**\n` +
        `Usa \`/top voice pagina:${page < totalPages ? page + 1 : 1}\` para ver más`,
      inline: false,
    })
    .setFooter({
      text: "Hoshiko Levels 🌸 • ¡Habla más tiempo!",
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
