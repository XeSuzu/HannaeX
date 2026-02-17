import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Guild,
  Message,
  InteractionResponse,
} from "discord.js";
import { HoshikoClient } from "../../../index";

// --- Interfaces ---

// ✅ Interfaz corregida para aceptar todos los tipos de respuesta posibles
interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<void | Message | InteractionResponse>;
}

interface BotStats {
  totalServers: number;
  totalMembers: number;
  totalChannels: number;
  totalRoles: number;
  averageMembers: number;
  largestGuild: Guild | null;
  smallestGuild: Guild | null;
}

// --- Funciones de Utilidad (ahora con tipos) ---

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateStats(client: HoshikoClient): BotStats {
  const guilds = Array.from(client.guilds.cache.values());
  if (guilds.length === 0) {
    return {
      totalServers: 0,
      totalMembers: 0,
      totalChannels: 0,
      totalRoles: 0,
      averageMembers: 0,
      largestGuild: null,
      smallestGuild: null,
    };
  }
  const totalMembers = guilds.reduce(
    (acc, guild) => acc + guild.memberCount,
    0,
  );
  const totalChannels = guilds.reduce(
    (acc, guild) => acc + guild.channels.cache.size,
    0,
  );
  const totalRoles = guilds.reduce(
    (acc, guild) => acc + guild.roles.cache.size,
    0,
  );
  const largestGuild = guilds.reduce(
    (max, guild) => (guild.memberCount > max.memberCount ? guild : max),
    guilds[0],
  );
  const smallestGuild = guilds.reduce(
    (min, guild) => (guild.memberCount < min.memberCount ? guild : min),
    guilds[0],
  );
  return {
    totalServers: guilds.length,
    totalMembers,
    totalChannels,
    totalRoles,
    averageMembers: Math.round(totalMembers / guilds.length),
    largestGuild,
    smallestGuild,
  };
}

function createStatsEmbed(
  client: HoshikoClient,
  stats: BotStats,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: `${client.user?.username} - Panel de Control`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle("📊 Estadísticas Generales del Bot");
  if (stats.totalServers > 0 && stats.largestGuild && stats.smallestGuild) {
    embed.addFields(
      {
        name: "🌐 Presencia Global",
        value: `╰ **Servidores:** ${formatNumber(stats.totalServers)}\n╰ **Usuarios:** ${formatNumber(stats.totalMembers)}`,
        inline: true,
      },
      {
        name: "📈 Promedios",
        value: `╰ **Miembros/servidor:** ${formatNumber(stats.averageMembers)}`,
        inline: true,
      },
      {
        name: "🏆 Servidor más grande",
        value: `╰ **${stats.largestGuild.name}**: ${formatNumber(stats.largestGuild.memberCount)} miembros`,
        inline: false,
      },
      {
        name: "🌱 Servidor más pequeño",
        value: `╰ **${stats.smallestGuild.name}**: ${formatNumber(stats.smallestGuild.memberCount)} miembros`,
        inline: false,
      },
    );
  } else {
    embed.setDescription("Aún no hay servidores para mostrar estadísticas.");
  }
  return embed;
}

function createServersPageEmbed(
  client: HoshikoClient,
  guilds: Guild[],
  page: number,
  totalPages: number,
): EmbedBuilder {
  const SERVERS_PER_PAGE = 10;
  const start = page * SERVERS_PER_PAGE;
  const pageGuilds = guilds.slice(start, start + SERVERS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(0x87ceeb)
    .setAuthor({
      name: `${client.user?.username} - Lista de Servidores`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`📋 Servidores (Página ${page + 1}/${totalPages})`);

  const description = pageGuilds
    .map((guild, index) => {
      const joinedAt = guild.joinedTimestamp
        ? Math.floor(guild.joinedTimestamp / 1000)
        : 0;
      return `${start + index + 1}. **${guild.name}** (\`${guild.id}\`)\n   Miembros: ${formatNumber(guild.memberCount)} | Me uní: <t:${joinedAt}:R>`;
    })
    .join("\n\n");

  embed.setDescription(description || "No hay servidores en esta página.");
  return embed;
}

function createNavigationButtons(
  currentPage: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("stats")
      .setLabel("Estadísticas")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("Anterior")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Siguiente")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );
}

const command: SlashCommand = {
  category: "Admin",
  data: new SlashCommandBuilder()
    .setName("servidores")
    .setDescription("Ve la lista de servidores del bot (Solo para el dueño)")
    .addStringOption((option) =>
      option.setName("buscar").setDescription("Buscar un servidor por nombre"),
    )
    .addStringOption((option) =>
      option
        .setName("ordenar")
        .setDescription("Ordenar servidores por...")
        .addChoices(
          { name: "👥 Miembros (Mayor a menor)", value: "members_desc" },
          { name: "👥 Miembros (Menor a mayor)", value: "members_asc" },
          { name: "📅 Fecha de unión (Más reciente)", value: "joined_desc" },
          { name: "📅 Fecha de unión (Más antiguo)", value: "joined_asc" },
        ),
    ),

  async execute(interaction, client) {
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      return interaction.reply({
        content:
          "❌ Nyaa... este es un comando solo para el propietario del bot. 😿",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const searchQuery = interaction.options.getString("buscar");
      const sortOption =
        interaction.options.getString("ordenar") || "members_desc";

      let guilds = Array.from(client.guilds.cache.values());
      if (searchQuery) {
        guilds = guilds.filter((guild) =>
          guild.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      switch (sortOption) {
        case "members_desc":
          guilds.sort((a, b) => b.memberCount - a.memberCount);
          break;
        case "members_asc":
          guilds.sort((a, b) => a.memberCount - b.memberCount);
          break;
        case "joined_desc":
          guilds.sort(
            (a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0),
          );
          break;
        case "joined_asc":
          guilds.sort(
            (a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0),
          );
          break;
      }

      if (guilds.length === 0) {
        return interaction.editReply({
          content: `❌ No encontré ningún servidor con el nombre "${searchQuery}", nyaa~`,
        });
      }

      const stats = calculateStats(client);
      const totalPages = Math.ceil(guilds.length / 10);
      let currentPage = 0;

      const statsEmbed = createStatsEmbed(client, stats);
      const buttons = createNavigationButtons(currentPage, totalPages);
      const response = await interaction.editReply({
        embeds: [statsEmbed],
        components: [buttons],
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "❌ Solo el dueño del bot puede usar estos botones.",
            ephemeral: true,
          });
        }

        if (i.customId === "stats") {
          await i.update({
            embeds: [statsEmbed],
            components: [createNavigationButtons(currentPage, totalPages)],
          });
          return;
        }

        switch (i.customId) {
          case "prev":
            currentPage--;
            break;
          case "next":
            currentPage++;
            break;
        }

        const pageEmbed = createServersPageEmbed(
          client,
          guilds,
          currentPage,
          totalPages,
        );
        await i.update({
          embeds: [pageEmbed],
          components: [createNavigationButtons(currentPage, totalPages)],
        });
      });

      collector.on("end", () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (error: any) {
      console.error("❌ Error al obtener la lista de servidores:", error);
      await interaction.editReply({
        content: "¡Ups! Algo salió mal. 😿\n```" + error.message + "```",
      });
    }
  },
};

export = command;
