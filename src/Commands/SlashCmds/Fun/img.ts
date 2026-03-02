import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { SearchService, isQuerySafe } from "../../../Services/search";
import { HoshikoClient } from "../../../index";

const command: SlashCommand = {
  category: "Fun",
  data: new SlashCommandBuilder()
    .setName("img")
    .setDescription("🖼️ Busca imágenes en la web.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("¿Qué imagen quieres buscar?")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    const query = interaction.options.getString("query", true);

    // --- 🔞 Verificar si el canal es NSFW ---
    const isNsfwChannel =
      interaction.channel instanceof TextChannel && interaction.channel.nsfw;

    // --- 🚫 Verificar lista negra (aplica siempre en canales no-NSFW) ---
    if (!isNsfwChannel && !isQuerySafe(query)) {
      await interaction.editReply(
        "🚫 Ese término no está permitido en este canal. Intenta en un canal habilitado para contenido adulto.",
      );
      return;
    }

    // En canales NSFW, se desactiva SafeSearch; en el resto, se mantiene activo
    const results = await SearchService.searchImages(query, 10, !isNsfwChannel);

    if (!results || results.length === 0) {
      await interaction.editReply(`😿 Mya... no encontré ninguna imagen para \`${query}\`.`);
      return;
    }

    let page = 0;
    const total = results.length;

    const buildProgress = (index: number, total: number) => {
      const filled = Math.round((index / (total - 1)) * 8);
      return "▰".repeat(filled) + "▱".repeat(8 - filled);
    };

    const buildEmbed = (index: number) => {
      const img = results[index];
      const progress = buildProgress(index, total);

      return new EmbedBuilder()
        .setColor(0xff8fab)
        .setAuthor({
          name: `🔍 ${query}`,
          iconURL: client.user?.displayAvatarURL(),
        })
        .setTitle(img.title?.substring(0, 256) || query)
        .setURL(img.link)
        .setImage(img.imageUrl)
        .addFields(
          { name: "🌐 Fuente", value: `[${img.source}](${img.link})`, inline: true },
          { name: "🖼️ Resultado", value: `\`${index + 1} de ${total}\``, inline: true },
        )
        .setFooter({
          text: `${progress} • pedida por ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });
    };

    const buildButtons = (index: number) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("img_first")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId("img_prev")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId("img_next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === total - 1),
        new ButtonBuilder()
          .setCustomId("img_last")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === total - 1),
        new ButtonBuilder()
          .setCustomId("img_close")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

    const msg = await interaction.editReply({
      embeds: [buildEmbed(page)],
      components: [buildButtons(page)],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      if (i.customId === "img_close") {
        collector.stop();
        return;
      }

      if (i.customId === "img_first") page = 0;
      else if (i.customId === "img_prev") page = Math.max(0, page - 1);
      else if (i.customId === "img_next") page = Math.min(total - 1, page + 1);
      else if (i.customId === "img_last") page = total - 1;

      await interaction.editReply({
        embeds: [buildEmbed(page)],
        components: [buildButtons(page)],
      });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;
