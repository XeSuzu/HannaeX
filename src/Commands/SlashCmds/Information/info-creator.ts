import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Message
} from 'discord.js';
import { HoshikoClient } from '../../../index';

interface SlashCommand {
  data: SlashCommandBuilder;
  category: string;
  execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message>;
}

const command: SlashCommand = {
  category: 'Information',
  data: new SlashCommandBuilder()
    .setName('infocreator')
    .setDescription('🌸 Conoce a quien está detrás de Hoshiko'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const creatorId = process.env.BOT_OWNER_ID || client.application?.owner?.id;
      if (!creatorId) {
        return interaction.editReply({ content: '😿 No encontré la información de mi creadora...' });
      }

      const creator = await client.users.fetch(creatorId).catch(() => null);
      if (!creator) {
        return interaction.editReply({ content: '😿 Nyaa~ No pude cargar los datos...' });
      }

      await creator.fetch(true);

      const pastelColors = [0xFFC0CB, 0xFFB6C1, 0xFFD1DC, 0xF8BBD0];
      const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
          name: `${creator.username}`,
          iconURL: creator.displayAvatarURL({ size: 256 })
        })
        .setTitle('🌸 La historia detrás de Hoshiko')
        .setThumbnail(creator.displayAvatarURL({ size: 512 }))
        .setDescription(
          `> 💫 **Hola, nya~** Permíteme contarte un poquito sobre nosotras.\n\n` +
          `Hoshiko nació de la curiosidad, el cariño y las ganas de aprender. 🌷\n` +
          `No fue un proyecto enorme ni algo planeado... solo una idea tierna que fue tomando forma, ` +
          `hasta volverse una pequeña compañera digital llena de vida y ternura.\n\n` +
          `Cada mejora, cada comando, es una muestra de paciencia, amor y dedicación. 🌱`
        )
        .addFields(
          {
            name: '💭 Inspiración',
            value:
              '```\n' +
              'Crear algo que no solo funcione, sino que también\n' +
              'transmita calidez y compañía en los servidores.\n' +
              'Un bot que combine técnica con emoción. 💖\n' +
              '```',
            inline: false
          },
          {
            name: '🎨 Sobre su creadora',
            value:
              '```\n' +
              'Amy — una programadora en constante aprendizaje.\n' +
              'Le gusta experimentar, cuidar los detalles y hacer\n' +
              'que cada línea de código tenga un propósito. 🧠\n' +
              '```',
            inline: false
          },
          {
            name: '🌟 Estado actual',
            value:
              '```\n' +
              'Hoshiko sigue creciendo día a día, aprendiendo\n' +
              'y mejorando. No es perfecta, pero está hecha con\n' +
              'dedicación, cariño y muchos ronroneos. 🐾\n' +
              '```',
            inline: false
          }
        )
        .setFooter({
          text: 'By Hoshiko • 2025 🌸',
          iconURL: client.user?.displayAvatarURL() ?? undefined
        })
        .setTimestamp()
        .setImage('https://i.pinimg.com/1200x/eb/a3/43/eba34334f0141ac5ef1ab5c3819b300d.jpg'); // 🔧 banner final “By Hoshiko”

      const buttons = new ActionRowBuilder<ButtonBuilder>();

      buttons.addComponents(
        new ButtonBuilder()
          .setLabel('Invita a Hoshiko')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`)
          .setEmoji('🌸')
      );

      /*
      // 💬 Botón de servidor de soporte (bloqueado hasta tener link)
      buttons.addComponents(
        new ButtonBuilder()
          .setLabel('Servidor de Soporte')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/TU-SERVIDOR') 
          .setEmoji('💬')
      );

      // ☕ Botón de donación (bloqueado hasta tener enlace)
      buttons.addComponents(
        new ButtonBuilder()
          .setLabel('Donar ☕')
          .setStyle(ButtonStyle.Link)
          .setURL('https://ko-fi.com/TU-LINK') 
          .setEmoji('💝')
      );
      */

      const components = buttons.components.length > 0 ? [buttons] : [];

      await interaction.editReply({
        embeds: [embed],
        components
      });

    } catch (error) {
      console.error('❌ Error en /infocreator:', error);
      await interaction.editReply({
        content: '😿 Algo salió mal... inténtalo de nuevo en un momentito.'
      }).catch(() => {});
    }
  }
};

export = command;
