import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  Guild,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { Logger } from "../../../Utils/SystemLogger";

const PAGE_SIZE = 10;
const MAX_EMBED_SERVERS = 50;

function buildTxtAttachment(guilds: Guild[], totalMembers: number): AttachmentBuilder {
  const timestamp = new Date().toISOString();
  let fileContent = `🌸 REGISTRO OFICIAL DE SERVIDORES ACTIVOS - HOSHIKO 🌸\n`;
  fileContent += `Generado: ${timestamp}\n`;
  fileContent += `Total de Servidores: ${guilds.length} | Usuarios Alcanzados: ${totalMembers.toLocaleString()}\n`;
  fileContent += `================================================================================\n\n`;

  guilds.forEach((g, index) => {
    const joinedAt = g.joinedAt ? g.joinedAt.toISOString() : "Desconocido";
    const createdAt = g.createdAt ? g.createdAt.toISOString() : "Desconocido";
    const channelsCount = g.channels.cache.size;
    const rolesCount = g.roles.cache.size;

    fileContent += `#${index + 1} - [${g.name}]\n`;
    fileContent += `  • ID: ${g.id}\n`;
    fileContent += `  • Miembros: ${g.memberCount.toLocaleString()}\n`;
    fileContent += `  • Propietario (Owner ID): ${g.ownerId}\n`;
    fileContent += `  • Canales: ${channelsCount} | Roles: ${rolesCount}\n`;
    fileContent += `  • Fecha Creación Servidor: ${createdAt}\n`;
    fileContent += `  • Hoshiko se unió el: ${joinedAt}\n\n`;
  });

  const buffer = Buffer.from(fileContent, "utf-8");
  return new AttachmentBuilder(buffer, {
    name: `hoshiko-servidores-activos-${Date.now()}.txt`,
  });
}

function buildPageEmbed(
  guilds: Guild[],
  pageIndex: number,
  totalPages: number,
  totalServers: number,
  totalMembers: number,
): EmbedBuilder {
  const start = pageIndex * PAGE_SIZE;
  const currentSlice = guilds.slice(start, start + PAGE_SIZE);

  let desc = `📊 **Total Servidores:** \`${totalServers}\` | 👥 **Usuarios:** \`${totalMembers.toLocaleString()}\` | 📈 **Promedio:** \`${Math.round(totalMembers / (totalServers || 1))}\` por server\n`;

  if (totalServers > MAX_EMBED_SERVERS) {
    desc += `> ⚠️ *Mostrando los primeros 50 servidores ordenados por miembros. La lista completa de ${totalServers} servidores se ha adjuntado en el archivo \`.txt\`.*\n\n`;
  } else {
    desc += `> *Servidores ordenados por mayor cantidad de miembros.*\n\n`;
  }

  const serverLines = currentSlice.map((g, idx) => {
    const globalIdx = start + idx + 1;
    const joinedStr = g.joinedTimestamp
      ? `<t:${Math.floor(g.joinedTimestamp / 1000)}:R>`
      : "Desconocido";
    return `**${globalIdx}. ${g.name}**\n> 🆔 \`${g.id}\` • 👥 **${g.memberCount.toLocaleString()}** miembros • 👑 <@${g.ownerId}>\n> 📅 Se unió: ${joinedStr}`;
  });

  desc += serverLines.join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle("🌸 Servidores Activos de Hoshiko")
    .setColor(0xeba6d1)
    .setDescription(desc)
    .setFooter({
      text: `Página ${pageIndex + 1} de ${totalPages} • Mostrando ${start + 1}-${start + currentSlice.length} de ${Math.min(totalServers, MAX_EMBED_SERVERS)} (Total global: ${totalServers})`,
    })
    .setTimestamp();

  return embed;
}

function buildNavRow(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("dev_srv_first")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("dev_srv_prev")
      .setEmoji("◀️")
      .setLabel("Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("dev_srv_counter")
      .setLabel(`${currentPage + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("dev_srv_next")
      .setEmoji("▶️")
      .setLabel("Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId("dev_srv_last")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("dev-servers")
    .setDescription("[DEV] Muestra la lista paginada de servidores activos (hasta 50 en embed y .txt actualizado).")
    .addBooleanOption((opt) =>
      opt
        .setName("txt")
        .setDescription("Forzar adjuntar el archivo .txt con la lista completa sin importar la cantidad.")
        .setRequired(false)
    ),

  aliases: ["dev_servers", "devservers", "servidores-dev"],
  category: "Owner",

  async execute(interaction: ChatInputCommandInteraction) {
    const ownerId = process.env.BOT_OWNER_ID;
    if (!ownerId) {
      return interaction.editReply({
        content: "⚠️ **Error de Configuración:** Falta `BOT_OWNER_ID` en el archivo .env",
      });
    }

    if (interaction.user.id !== ownerId) {
      await Logger.logSecurityBreach(interaction.user, "dev-servers");
      return interaction.editReply({
        content: "🚫 ¡Oye! Solo mi desarrollador puede consultar esta lista privada.",
      });
    }

    const guilds = interaction.client.guilds.cache;
    const totalServers = guilds.size;
    const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);

    const sortedGuilds = [...guilds.values()].sort(
      (a, b) => b.memberCount - a.memberCount,
    );

    const embedGuilds = sortedGuilds.slice(0, MAX_EMBED_SERVERS);
    const totalPages = Math.max(1, Math.ceil(embedGuilds.length / PAGE_SIZE));
    let currentPage = 0;

    const forceTxt = interaction.options.getBoolean("txt") || false;
    const shouldAttachTxt = forceTxt || totalServers > MAX_EMBED_SERVERS;
    const txtAttachment = shouldAttachTxt ? buildTxtAttachment(sortedGuilds, totalMembers) : null;

    const embed = buildPageEmbed(embedGuilds, currentPage, totalPages, totalServers, totalMembers);
    const components = totalPages > 1 ? [buildNavRow(currentPage, totalPages)] : [];
    const files = txtAttachment ? [txtAttachment] : [];

    const replyMsg = await interaction.editReply({
      embeds: [embed],
      components,
      files,
    });

    if (totalPages <= 1) return;

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (btn) => btn.user.id === interaction.user.id,
      time: 5 * 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "dev_srv_first") currentPage = 0;
      else if (i.customId === "dev_srv_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "dev_srv_next") currentPage = Math.min(totalPages - 1, currentPage + 1);
      else if (i.customId === "dev_srv_last") currentPage = totalPages - 1;

      const updatedEmbed = buildPageEmbed(
        embedGuilds,
        currentPage,
        totalPages,
        totalServers,
        totalMembers,
      );
      const updatedRow = buildNavRow(currentPage, totalPages);

      await i.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      });
    });

    collector.on("end", () => {
      const disabledNav = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buildNavRow(currentPage, totalPages).components.map((btn) =>
          ButtonBuilder.from(btn).setDisabled(true),
        ),
      );
      interaction.editReply({ components: [disabledNav] }).catch(() => {});
    });
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const ownerId = process.env.BOT_OWNER_ID;
    if (!ownerId || message.author.id !== ownerId) {
      await Logger.logSecurityBreach(message.author, "dev-servers");
      await message.reply("🚫 ¡Oye! Solo mi desarrollador puede consultar esta lista privada.");
      return;
    }

    const guilds = client.guilds.cache;
    const totalServers = guilds.size;
    const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);

    const sortedGuilds = [...guilds.values()].sort(
      (a, b) => b.memberCount - a.memberCount,
    );

    const embedGuilds = sortedGuilds.slice(0, MAX_EMBED_SERVERS);
    const totalPages = Math.max(1, Math.ceil(embedGuilds.length / PAGE_SIZE));
    let currentPage = 0;

    const forceTxt = args.includes("--txt") || args.includes("txt");
    const shouldAttachTxt = forceTxt || totalServers > MAX_EMBED_SERVERS;
    const txtAttachment = shouldAttachTxt ? buildTxtAttachment(sortedGuilds, totalMembers) : null;

    const embed = buildPageEmbed(embedGuilds, currentPage, totalPages, totalServers, totalMembers);
    const components = totalPages > 1 ? [buildNavRow(currentPage, totalPages)] : [];
    const files = txtAttachment ? [txtAttachment] : [];

    const replyMsg = await message.reply({
      embeds: [embed],
      components,
      files,
    });

    if (totalPages <= 1) return;

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (btn) => btn.user.id === message.author.id,
      time: 5 * 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "dev_srv_first") currentPage = 0;
      else if (i.customId === "dev_srv_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "dev_srv_next") currentPage = Math.min(totalPages - 1, currentPage + 1);
      else if (i.customId === "dev_srv_last") currentPage = totalPages - 1;

      const updatedEmbed = buildPageEmbed(
        embedGuilds,
        currentPage,
        totalPages,
        totalServers,
        totalMembers,
      );
      const updatedRow = buildNavRow(currentPage, totalPages);

      await i.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      });
    });

    collector.on("end", () => {
      const disabledNav = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buildNavRow(currentPage, totalPages).components.map((btn) =>
          ButtonBuilder.from(btn).setDisabled(true),
        ),
      );
      replyMsg.edit({ components: [disabledNav] }).catch(() => {});
    });
  },
};

export default command;
