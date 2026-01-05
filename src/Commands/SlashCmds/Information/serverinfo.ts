import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Message,
  InteractionResponse,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  GuildPremiumTier
} from 'discord.js';
import { HoshikoClient } from '../../../index';

interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message | InteractionResponse>;
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Desconocido';
  const unix = Math.floor(timestamp / 1000);
  return `${`<t:${unix}:D>`} (<t:${unix}:R>)`;
}

function formatPremiumTier(tier: GuildPremiumTier | number): string {
  switch (tier) {
    case GuildPremiumTier.Tier1:
      return 'Nivel 1';
    case GuildPremiumTier.Tier2:
      return 'Nivel 2';
    case GuildPremiumTier.Tier3:
      return 'Nivel 3';
    default:
      return 'Sin nivel';
  }
}

function getChannelStats(guild: any) {
  const channels = guild.channels.cache;
  const text = channels.filter((c: any) => c.type === ChannelType.GuildText).size;
  const voice = channels.filter((c: any) => c.type === ChannelType.GuildVoice).size;
  const categories = channels.filter((c: any) => c.type === ChannelType.GuildCategory).size;
  const forums = channels.filter((c: any) => c.type === ChannelType.GuildForum).size;
  const stage = channels.filter((c: any) => c.type === ChannelType.GuildStageVoice).size;
  const news = channels.filter((c: any) => c.type === ChannelType.GuildAnnouncement).size;

  return { text, voice, categories, forums, stage, news, total: channels.size };
}

function getMemberStats(guild: any) {
  const members = guild.members.cache;
  const total = guild.memberCount ?? members.size;
  const bots = members.filter((m: any) => m.user.bot).size;
  const humans = total - bots;
  const online = members.filter((m: any) => m.presence && m.presence.status !== 'offline').size;

  return { total, humans, bots, online };
}

const command: SlashCommand = {
  category: 'Profiles',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Muestra un perfil detallado del servidor, nyaa~!'),

  async execute(interaction, client) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse en un servidor.'
      });
      return;
    }

    const guild = interaction.guild;

    try {
      await interaction.deferReply();

      const owner = await guild.fetchOwner().catch(() => null);
      const iconURL = guild.iconURL({ size: 512 });
      const bannerURL = guild.bannerURL({ size: 1024 });

      const channelStats = getChannelStats(guild);
      const memberStats = getMemberStats(guild);

      const boostCount = guild.premiumSubscriptionCount ?? 0;
      const boostTier = formatPremiumTier(guild.premiumTier);

      const mainColor = guild.members.me?.displayHexColor || 0x5865F2;

      const embed = new EmbedBuilder()
        .setColor(mainColor)
        .setAuthor({
          name: `Perfil del servidor`,
          iconURL: iconURL ?? undefined
        })
        .setTitle(`━━━━━━ ✦ ${guild.name} ✦ ━━━━━━`)
        .setThumbnail(iconURL || null)
        .setTimestamp()
        .setFooter({
          text: `Consultado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      if (bannerURL) {
        embed.setImage(bannerURL);
      }

      embed.addFields({
        name: '┌─ 🏰 INFORMACIÓN BÁSICA',
        value: [
          `│ **Nombre:** ${guild.name}`,
          `│ **ID:** \`${guild.id}\``,
          `│ **Dueño/a:** ${owner ? `${owner.user.tag} (${owner.user.id})` : 'Desconocido'}`,
          `│ **Creado:** ${formatDate(guild.createdTimestamp)}`,
          `└─ **Nivel de verificación:** ${guild.verificationLevel}`
        ].join('\n'),
        inline: false
      });

      embed.addFields({
        name: '┌─ 👥 MIEMBROS',
        value: [
          `│ **Total:** ${memberStats.total}`,
          `│ **Humanos:** ${memberStats.humans}`,
          `│ **Bots:** ${memberStats.bots}`,
          `└─ **Con presencia visible:** ${memberStats.online}`
        ].join('\n'),
        inline: false
      });

      embed.addFields({
        name: '┌─ 📚 CANALES',
        value: [
          `│ **Total:** ${channelStats.total}`,
          `│ **Texto:** ${channelStats.text}`,
          `│ **Voz:** ${channelStats.voice}`,
          `│ **Categorías:** ${channelStats.categories}`,
          `│ **Anuncios:** ${channelStats.news}`,
          `│ **Escenario:** ${channelStats.stage}`,
          `└─ **Foros:** ${channelStats.forums}`
        ].join('\n'),
        inline: false
      });

      embed.addFields({
        name: '┌─ 💎 BOOSTS',
        value: [
          `│ **Boosts actuales:** ${boostCount}`,
          `└─ **Nivel de servidor:** ${boostTier}`
        ].join('\n'),
        inline: false
      });

      const roleCount = guild.roles.cache.size - 1;
      const emojiCount = guild.emojis.cache.size;
      const stickerCount = guild.stickers.cache.size;

      embed.addFields({
        name: '┌─ 🎨 PERSONALIZACIÓN',
        value: [
          `│ **Roles:** ${roleCount}`,
          `│ **Emojis:** ${emojiCount}`,
          `└─ **Stickers:** ${stickerCount}`
        ].join('\n'),
        inline: false
      });

      if (guild.features && guild.features.length > 0) {
        const features = guild.features
          .map((f: string) => `\`${f.replace(/_/g, ' ').toLowerCase()}\``)
          .join(', ');
        embed.addFields({
          name: '┌─ ✨ CARACTERÍSTICAS ESPECIALES',
          value: `│ ${features}\n└─`,
          inline: false
        });
      }

      const buttons = new ActionRowBuilder<ButtonBuilder>();
      if (iconURL) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`icon_${guild.id}`)
            .setLabel('Ver Icono')
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Primary)
        );
      }

      if (bannerURL) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`banner_${guild.id}`)
            .setLabel('Ver Banner')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Primary)
        );
      }

      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_${guild.id}`)
          .setLabel('Ver resumen rápido')
          .setEmoji('📊')
          .setStyle(ButtonStyle.Success)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [buttons]
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          return buttonInteraction.reply({
            content: '❌ Solo quien ejecutó el comando puede usar estos botones.',
            ephemeral: true
          });
        }

        const [action, guildId] = buttonInteraction.customId.split('_');
        if (guildId !== guild.id) return;

        if (action === 'icon') {
          if (!iconURL) {
            return buttonInteraction.reply({
              content: '❌ Este servidor no tiene icono configurado.',
              ephemeral: true
            });
          }
          const iconEmbed = new EmbedBuilder()
            .setColor(mainColor)
            .setAuthor({
              name: `Icono de ${guild.name}`,
              iconURL: iconURL
            })
            .setImage(guild.iconURL({ size: 4096 })!)
            .setDescription(`[Descargar icono](${guild.iconURL({ size: 4096 })})`)
            .setFooter({ text: 'Presiona el botón "Volver" para regresar' });

          const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('back')
              .setLabel('← Volver')
              .setStyle(ButtonStyle.Secondary)
          );

          await buttonInteraction.update({
            embeds: [iconEmbed],
            components: [backRow]
          });
        } else if (action === 'banner') {
          if (!bannerURL) {
            return buttonInteraction.reply({
              content: '❌ Este servidor no tiene banner configurado.',
              ephemeral: true
            });
          }

          const bannerEmbed = new EmbedBuilder()
            .setColor(mainColor)
            .setAuthor({
              name: `Banner de ${guild.name}`,
              iconURL: iconURL ?? undefined
            })
            .setImage(guild.bannerURL({ size: 4096 })!)
            .setDescription(`[Descargar banner](${guild.bannerURL({ size: 4096 })})`)
            .setFooter({ text: 'Presiona el botón "Volver" para regresar' });

          const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('back')
              .setLabel('← Volver')
              .setStyle(ButtonStyle.Secondary)
          );

          await buttonInteraction.update({
            embeds: [bannerEmbed],
            components: [backRow]
          });
        } else if (action === 'stats') {
          const statsEmbed = new EmbedBuilder()
            .setColor(mainColor)
            .setTitle(`📊 Resumen rápido de ${guild.name}`)
            .addFields(
              {
                name: '👥 Miembros',
                value: `Total: **${memberStats.total}**\nHumanos: **${memberStats.humans}**\nBots: **${memberStats.bots}**\nCon presencia: **${memberStats.online}**`,
                inline: true
              },
              {
                name: '📚 Canales',
                value: `Totales: **${channelStats.total}**\nTexto: **${channelStats.text}**\nVoz: **${channelStats.voice}**\nCategorías: **${channelStats.categories}**`,
                inline: true
              },
              {
                name: '💎 Boosts',
                value: `Boosts: **${boostCount}**\nNivel: **${boostTier}**`,
                inline: true
              }
            )
            .setFooter({ text: 'Presiona el botón "Volver" para regresar' });

          const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('back')
              .setLabel('← Volver')
              .setStyle(ButtonStyle.Secondary)
          );

          await buttonInteraction.update({
            embeds: [statsEmbed],
            components: [backRow]
          });
        } else if (action === 'back') {
          await buttonInteraction.update({
            embeds: [embed],
            components: [buttons]
          });
        }
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>();
        buttons.components.forEach((component) => {
          const btn = component as ButtonBuilder;
          if (btn.data.style === ButtonStyle.Link) {
            disabledRow.addComponents(btn);
          } else {
            disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true));
          }
        });

        interaction.editReply({ components: [disabledRow] }).catch(() => {});
      });

    } catch (error: any) {
      console.error('❌ Error en /serverinfo:', error);
      const errorMessage = {
        content: '❌ Ocurrió un error al obtener la información del servidor.',
        embeds: [],
        components: []
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(console.error);
      } else {
        await interaction.reply(errorMessage).catch(console.error);
      }
    }
  }
};

export = command;
